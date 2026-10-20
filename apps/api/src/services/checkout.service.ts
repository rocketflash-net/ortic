import Service from "@base/service.base";
import { biteshipConfig, qrisMdrAmount } from "@config/order.config";
import { paymentConfig } from "@config/payment.config";
import { logger } from "@config/logger.config";
import OrderDto from "@dto/order.dto";
import ShippingRateDto from "@dto/shipping-rate.dto";
import UserAddressDto from "@dto/user-address.dto";
import OrderEventTypeEnum from "@enums/order-event-type.enum";
import OrderStatusEnum from "@enums/order-status.enum";
import NotFoundException from "@exceptions/not-found.exception";
import PaymentProviderException from "@exceptions/payment-provider.exception";
import ShippingProviderException from "@exceptions/shipping-provider.exception";
import ValidationException from "@exceptions/validation.exception";
import BiteshipHelper from "@helpers/biteship/biteship-api.helper";
import { createPaymentGateway } from "@helpers/payment/payment-gateway.factory";
import { qrisInFlight } from "@helpers/payment/qris-in-flight.helper";
import CartRepository from "@repositories/cart.repository";
import CatalogRepository from "@repositories/catalog.repository";
import CourierRepository from "@repositories/courier.repository";
import OrderEventRepository from "@repositories/order-event.repository";
import OrderRepository from "@repositories/order.repository";
import ProductRepository from "@repositories/product.repository";
import SettingRepository from "@repositories/setting.repository";
import StockRepository from "@repositories/stock.repository";
import UserAddressRepository from "@repositories/user-address.repository";
import WarehouseRepository from "@repositories/warehouse.repository";
import StockService from "@services/stock.service";
import { CourierType, UserAddressType, WarehouseType } from "@@types/entity.type";
import ResponseType from "@@types/response.type";
import { randomCode } from "@utils/crypto.util";
import { effectivePrice } from "@utils/price.util";
import { CartItemsInputType, CheckoutQuoteInputType, PlaceOrderInputType } from "@validators/checkout.validator";

const NO_RATE_CODES = [40001001, 40001010];
const ORDER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type CartLineType = {
  variantId: number;
  productId: number;
  productName: string;
  productSlug: string;
  variantName: string | null;
  sku: string;
  imageUrl: string | null;
  price: number;
  basePrice: number;
  quantity: number;
  weightGram: number;
  subtotal: number;
};

type RateOptionType = ReturnType<typeof ShippingRateDto.fromBiteship>;

type QuoteContextType = {
  address: UserAddressType;
  warehouse: WarehouseType;
  lines: CartLineType[];
  itemsTotal: number;
  weightGram: number;
  serviceFee: number;
  insuredValue: number;
  insuranceRequired: boolean;
  insuranceThreshold: number;
  options: RateOptionType[];
};

/**
 * Checkout pembeli: hitung ulang keranjang dari database, pilih gudang, ongkir Biteship, lalu buat pesanan + QRIS.
 * Semua biaya ditanggung pembeli: total = barang + ongkir (+ asuransi) + biaya layanan. MDR QRIS hanya dicatat.
 *
 * Gudang asal: gudang aktif (punya area Biteship) yang stoknya cukup untuk SEMUA barang; bila lebih dari satu, yang
 * ongkir termurahnya paling murah. Keranjang yang tidak bisa dipenuhi satu gudang ditolak dengan pesan per barang
 * (pembeli memisah checkout). Stok dipesan (reserved) saat pesanan dibuat dan dilepas bila QRIS tidak dibayar.
 */
export default class CheckoutService extends Service {
  constructor(
    private readonly addressRepository: UserAddressRepository = new UserAddressRepository(),
    private readonly catalogRepository: CatalogRepository = new CatalogRepository(),
    private readonly productRepository: ProductRepository = new ProductRepository(),
    private readonly warehouseRepository: WarehouseRepository = new WarehouseRepository(),
    private readonly courierRepository: CourierRepository = new CourierRepository(),
    private readonly settingRepository: SettingRepository = new SettingRepository(),
    private readonly stockRepository: StockRepository = new StockRepository(),
    private readonly orderRepository: OrderRepository = new OrderRepository(),
    private readonly eventRepository: OrderEventRepository = new OrderEventRepository(),
    private readonly cartRepository: CartRepository = new CartRepository(),
    private readonly stockService: StockService = new StockService(),
    private readonly biteship: BiteshipHelper = new BiteshipHelper()
  ) {
    super();
  }

  async quote(userId: number, input: CheckoutQuoteInputType): Promise<ResponseType> {
    const context = await this.buildContext(userId, input);
    return this.success({
      address: UserAddressDto.fromEntity(context.address),
      origin: { id: context.warehouse.id, name: context.warehouse.name, city: context.warehouse.city },
      items: context.lines.map((line) => ({
        variant_id: line.variantId,
        product_name: line.productName,
        product_slug: line.productSlug,
        variant_name: line.variantName,
        image_url: line.imageUrl,
        price: line.price,
        quantity: line.quantity,
        subtotal: line.subtotal,
      })),
      items_total: context.itemsTotal,
      weight_gram: context.weightGram,
      service_fee: context.serviceFee,
      insured_value: context.insuredValue,
      insurance_required: context.insuranceRequired,
      insurance_threshold: context.insuranceThreshold,
      options: context.options,
      is_mock_rates: biteshipConfig.mockRates,
    });
  }

  async place(userId: number, input: PlaceOrderInputType): Promise<ResponseType> {
    const context = await this.buildContext(userId, input);
    const option = context.options.find((item) => item.courier_code === input.courier_code && item.service_code === input.service_code);
    if (!option) throw new ValidationException([{ field: "service_code", message: "This courier service is no longer available, choose another one" }]);

    const total = context.itemsTotal + option.price + context.serviceFee;
    const gateway = createPaymentGateway();
    const expiresAt = new Date(Date.now() + paymentConfig.orderTtlMinutes * 60 * 1000);

    const orderId = await this.orderRepository.transaction(async (tx) => {
      // Stok dipesan dulu (baris stok dikunci) supaya dua pembeli tidak membeli unit terakhir yang sama.
      await this.stockService.reserve(
        tx,
        context.warehouse.id,
        context.lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity }))
      );

      const repository = this.orderRepository.withTransaction(tx);
      const id = await repository.store({
        code: await this.newOrderCode(repository),
        userId,
        warehouseId: context.warehouse.id,
        status: OrderStatusEnum.awaiting_payment,
        recipientName: context.address.recipientName,
        recipientPhone: context.address.phone,
        address: context.address.address,
        province: context.address.province,
        city: context.address.city,
        district: context.address.district,
        postalCode: context.address.postalCode,
        biteshipAreaId: context.address.biteshipAreaId,
        addressNotes: context.address.notes,
        courierCode: option.courier_code,
        courierName: option.courier_name,
        courierServiceCode: option.service_code,
        courierServiceName: option.service_name,
        courierDuration: option.duration,
        weightGram: context.weightGram,
        insuredValue: context.insuredValue,
        itemsTotal: context.itemsTotal,
        shippingFee: option.shipping_fee,
        insuranceFee: option.insurance_fee,
        serviceFee: context.serviceFee,
        total,
        mdrAmount: qrisMdrAmount(total),
        paymentProvider: gateway.name,
        expiresAt,
      });
      await repository.storeItems(
        context.lines.map((line) => ({
          orderId: id,
          productId: line.productId,
          variantId: line.variantId,
          productName: line.productName,
          productSlug: line.productSlug,
          variantName: line.variantName,
          sku: line.sku,
          imageUrl: line.imageUrl,
          price: line.price,
          basePrice: line.basePrice,
          quantity: line.quantity,
          weightGram: line.weightGram,
          subtotal: line.subtotal,
        }))
      );
      await this.eventRepository.withTransaction(tx).store({
        orderId: id,
        type: OrderEventTypeEnum.status,
        status: OrderStatusEnum.awaiting_payment,
        title: "Pesanan dibuat",
        description: `Menunggu pembayaran QRIS · dikirim dari ${context.warehouse.name}`,
        actorUserId: userId,
        occurredAt: new Date(),
      });
      // Barang yang sudah dipesan keluar dari keranjang server.
      await this.cartRepository.withTransaction(tx).removeVariants(
        userId,
        context.lines.map((line) => line.variantId)
      );
      return id;
    });

    // QRIS dibuat setelah order tersimpan (butuh id). Gagal = order dibatalkan & stok dilepas, pembeli bisa checkout lagi.
    // Bila proses berhenti di tengah langkah ini, OrderService.show membuat QRIS-nya saat pembeli membuka pesanan.
    qrisInFlight.add(orderId);
    try {
      const qris = await gateway.createQris({ orderId, amount: total, expiresAt });
      await this.orderRepository.update(orderId, {
        providerRef: qris.providerRef,
        providerTransactionId: qris.providerTransactionId,
        qrString: qris.qrString,
        expiresAt: qris.expiresAt,
      });
    } catch (error) {
      logger.error({ err: error, orderId }, "[checkout] failed to create QRIS");
      await this.orderRepository.transition(orderId, [OrderStatusEnum.awaiting_payment], {
        status: OrderStatusEnum.cancelled,
        cancelledAt: new Date(),
        cancelReason: "QRIS gagal dibuat",
      });
      await this.stockService.releaseOrder((await this.orderRepository.findById(orderId))!);
      throw error instanceof PaymentProviderException ? error : new PaymentProviderException();
    } finally {
      qrisInFlight.delete(orderId);
    }

    const order = (await this.orderRepository.findById(orderId))!;
    logger.info({ orderId, code: order.code, total, provider: gateway.name, warehouseId: context.warehouse.id }, "[checkout] order placed");
    return this.created(
      OrderDto.detail(order, await this.orderRepository.findItems([orderId]), await this.eventRepository.findByOrder(orderId, true)),
      "Order created"
    );
  }

  private async buildContext(userId: number, input: CheckoutQuoteInputType & { warehouse_id?: number }): Promise<QuoteContextType> {
    const address = await this.addressRepository.findOwned(userId, input.address_id);
    if (!address) throw new NotFoundException("Address not found");

    const [lines, warehouses, couriers, settings] = await Promise.all([
      this.resolveLines(input.items),
      this.shippingWarehouses(),
      this.courierRepository.findActive(),
      this.settingRepository.getAll(),
    ]);

    const candidates = await this.candidateWarehouses(lines, warehouses, input.warehouse_id);
    const itemsTotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const weightGram = lines.reduce((sum, line) => sum + line.weightGram * line.quantity, 0) + settings.packaging_weight_gram;
    const insuranceThreshold = settings.insurance_required_above;
    const insuranceRequired = itemsTotal >= insuranceThreshold;
    const insuredValue = insuranceRequired || input.insure ? itemsTotal : 0;

    // Ongkir dari tiap gudang kandidat; pilih gudang dengan opsi termurah (gudang tanpa kurir di rute ini dilewati).
    let best: { warehouse: WarehouseType; options: RateOptionType[] } | null = null;
    for (const warehouse of candidates) {
      const options = await this.rates(warehouse, address, couriers, itemsTotal, weightGram, insuredValue);
      if (!best || (options.length && (!best.options.length || options[0].price < best.options[0].price))) best = { warehouse, options };
    }

    return {
      address,
      warehouse: best!.warehouse,
      lines,
      itemsTotal,
      weightGram,
      serviceFee: settings.service_fee,
      insuredValue,
      insuranceRequired,
      insuranceThreshold,
      options: best!.options,
    };
  }

  private async rates(
    warehouse: WarehouseType,
    address: UserAddressType,
    couriers: CourierType[],
    itemsTotal: number,
    weightGram: number,
    insuredValue: number
  ): Promise<RateOptionType[]> {
    if (!couriers.length) return [];
    try {
      const rates = await this.biteship.getRates(
        {
          origin_area_id: warehouse.biteshipAreaId!,
          destination_area_id: address.biteshipAreaId,
          couriers: couriers.map((courier) => courier.code).join(","),
          items: [{ name: "Paket Ortic", category: "healthcare", value: itemsTotal, quantity: 1, weight: weightGram }],
          ...(insuredValue ? { courier_insurance: insuredValue } : {}),
        },
        { cache: true }
      );
      const allowed = new Map(couriers.map((courier) => [courier.code, courier.services]));
      return rates.pricing
        .filter((pricing) => {
          const services = allowed.get(pricing.courier_code);
          return services !== undefined && (!services || services.includes(pricing.courier_service_code));
        })
        .map(ShippingRateDto.fromBiteship)
        .sort((a, b) => a.price - b.price);
    } catch (error) {
      if (error instanceof ShippingProviderException && error.providerCode !== null && NO_RATE_CODES.includes(error.providerCode)) return [];
      throw error;
    }
  }

  /**
   * Gudang yang stoknya cukup untuk seluruh keranjang (`preferredId` dipakai bila masih memenuhi, supaya pilihan kurir
   * di halaman checkout tetap berlaku). Tidak ada -> 422 dengan sisa stok per barang.
   */
  private async candidateWarehouses(lines: CartLineType[], warehouses: WarehouseType[], preferredId?: number): Promise<WarehouseType[]> {
    const availability = await this.stockRepository.availability(
      lines.map((line) => line.variantId),
      warehouses.map((warehouse) => warehouse.id)
    );
    const availableAt = (variantId: number, warehouseId: number) => availability.get(variantId)?.get(warehouseId) ?? 0;
    const complete = warehouses.filter((warehouse) => lines.every((line) => availableAt(line.variantId, warehouse.id) >= line.quantity));

    if (complete.length) {
      const preferred = complete.find((warehouse) => warehouse.id === preferredId);
      return preferred ? [preferred] : complete;
    }

    const errors = lines.flatMap((line, index) => {
      const best = Math.max(0, ...warehouses.map((warehouse) => availableAt(line.variantId, warehouse.id)));
      if (best >= line.quantity) return [];
      return [{ field: `items.${index}`, message: best > 0 ? `Only ${best} left in stock` : "Out of stock", available: best }];
    });
    if (errors.length) throw new ValidationException(errors, "Some items are out of stock");
    throw new ValidationException(
      [{ field: "items", message: "These items are stored in different warehouses. Please check them out in separate orders." }],
      "Items are in different warehouses"
    );
  }

  // Harga (termasuk promo yang sedang berjalan), nama, dan berat dari database; barang yang sudah tidak dijual ditolak per baris.
  private async resolveLines(items: CartItemsInputType): Promise<CartLineType[]> {
    const variants = await this.catalogRepository.findSellableVariants(items.map((item) => item.variant_id));
    const byId = new Map(variants.map((variant) => [variant.variantId, variant]));
    const missing = items.flatMap((item, index) =>
      byId.has(item.variant_id) ? [] : [{ field: `items.${index}`, message: "This item is no longer available" }]
    );
    if (missing.length) throw new ValidationException(missing);

    const now = new Date();
    const images = await this.productRepository.primaryImages([...new Set(variants.map((variant) => variant.productId))]);
    return items.map((item) => {
      const variant = byId.get(item.variant_id)!;
      const price = effectivePrice(variant, variant, now);
      return {
        variantId: variant.variantId,
        productId: variant.productId,
        productName: variant.productName,
        productSlug: variant.productSlug,
        variantName: variant.variantName,
        sku: variant.sku,
        imageUrl: images.get(variant.productId) ?? null,
        price,
        basePrice: variant.basePrice,
        quantity: item.quantity,
        weightGram: variant.weightGram,
        subtotal: price * item.quantity,
      };
    });
  }

  private async shippingWarehouses(): Promise<WarehouseType[]> {
    const warehouses = (await this.warehouseRepository.findAll()).filter((item) => item.isActive && item.biteshipAreaId);
    if (!warehouses.length) throw new ValidationException([{ field: "warehouse", message: "The store has no warehouse ready for shipping yet" }]);
    return warehouses;
  }

  // ORT-YYMMDD-XXXXX (tanggal WIB). Diulang bila kebetulan sudah dipakai.
  private async newOrderCode(repository: OrderRepository): Promise<string> {
    const wib = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();
    const date = wib.slice(2, 4) + wib.slice(5, 7) + wib.slice(8, 10);
    for (;;) {
      const code = `ORT-${date}-${randomCode(5, ORDER_CODE_ALPHABET)}`;
      if (!(await repository.codeExists(code))) return code;
    }
  }
}
