import { isProduction } from "@config/app.config";
import { biteshipConfig } from "@config/order.config";
import { logger } from "@config/logger.config";
import NotificationTypeEnum from "@enums/notification-type.enum";
import OrderEventTypeEnum from "@enums/order-event-type.enum";
import OrderStatusEnum, { OrderStatusType } from "@enums/order-status.enum";
import StockMovementTypeEnum from "@enums/stock-movement-type.enum";
import BadRequestException from "@exceptions/bad-request.exception";
import ShippingProviderException from "@exceptions/shipping-provider.exception";
import BiteshipHelper from "@helpers/biteship/biteship-api.helper";
import { nextMockStatus } from "@helpers/biteship/biteship-orders.mock";
import { biteshipStatusLabel, mapBiteshipStatus, PICKED_UP_STATUSES } from "@helpers/biteship/biteship-status.helper";
import OrderEventRepository from "@repositories/order-event.repository";
import OrderRepository from "@repositories/order.repository";
import SettingRepository from "@repositories/setting.repository";
import UserRepository from "@repositories/user.repository";
import WarehouseRepository from "@repositories/warehouse.repository";
import NotificationService from "@services/notification.service";
import OrderMailService from "@services/order-mail.service";
import StockService from "@services/stock.service";
import { BiteshipCreateOrderRequestType, BiteshipWebhookPayloadType } from "@@types/biteship.type";
import { NewOrderType, OrderType } from "@@types/entity.type";

type ShippingUpdateType = {
  status: string;
  waybillId?: string | null;
  trackingId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  link?: string | null;
  note?: string | null;
  occurredAt: Date;
};

// Booking otomatis dicoba ulang oleh job sampai batas ini; setelahnya admin klik "Booking ulang".
const MAX_AUTO_BOOKING_ATTEMPTS = 5;
// Pickup hari ini hanya bila booking dilakukan minimal sekian menit sebelum jam pickup gudang.
const PICKUP_LEAD_MINUTES = 60;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

// Urutan maju status pengiriman; status tidak pernah mundur karena update kurir yang datang terlambat.
const FORWARD_RANK: Partial<Record<OrderStatusType, number>> = {
  [OrderStatusEnum.processing]: 1,
  [OrderStatusEnum.awaiting_pickup]: 2,
  [OrderStatusEnum.shipped]: 3,
  [OrderStatusEnum.completed]: 4,
};

// Status pesanan yang masih menunggu update kurir.
const IN_DELIVERY_STATUSES: OrderStatusType[] = [
  OrderStatusEnum.processing,
  OrderStatusEnum.awaiting_pickup,
  OrderStatusEnum.shipped,
  OrderStatusEnum.needs_action,
];

/**
 * Pengiriman Biteship untuk pesanan yang sudah diterima toko:
 * - book(): order terjadwal (pickup di jam pickup gudang) -> resi. Gagal dicatat di pesanan & dicoba ulang oleh job.
 * - applyUpdate(): satu pintu untuk webhook, rekonsiliasi berkala, dan simulasi; memetakan status Biteship ke status
 *   pesanan (delivered -> Selesai, returned -> Dikembalikan + stok kembali, batal/ditolak kurir -> Perlu tindakan).
 */
export default class ShipmentService {
  constructor(
    private readonly orderRepository: OrderRepository = new OrderRepository(),
    private readonly eventRepository: OrderEventRepository = new OrderEventRepository(),
    private readonly warehouseRepository: WarehouseRepository = new WarehouseRepository(),
    private readonly settingRepository: SettingRepository = new SettingRepository(),
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly stockService: StockService = new StockService(),
    private readonly notificationService: NotificationService = new NotificationService(),
    private readonly orderMail: OrderMailService = new OrderMailService(),
    private readonly biteship: BiteshipHelper = new BiteshipHelper()
  ) {}

  /**
   * Booking kurir untuk pesanan berstatus Diproses yang belum punya order Biteship. Mengembalikan pesanan terbaru.
   * Tidak melempar error provider: kegagalan disimpan di `shipment_error` supaya pembayaran/konfirmasi tetap sukses.
   */
  async book(orderId: number, actorUserId: number | null = null): Promise<OrderType> {
    const order = (await this.orderRepository.findById(orderId))!;
    if (order.biteshipOrderId || order.status !== OrderStatusEnum.processing) return order;

    try {
      const { request, pickupAt } = await this.buildRequest(order);
      const result = await this.biteship.createOrder(request);
      await this.orderRepository.update(order.id, {
        biteshipOrderId: result.id,
        waybillId: result.courier.waybill_id,
        courierTrackingId: result.courier.tracking_id,
        courierLink: result.courier.link ?? null,
        shippingStatus: result.status,
        pickupScheduledAt: pickupAt,
        shipmentBookedAt: new Date(),
        shipmentAttempts: order.shipmentAttempts + 1,
        shipmentError: null,
        trackedAt: new Date(),
      });
      await this.eventRepository.store({
        orderId: order.id,
        type: OrderEventTypeEnum.tracking,
        status: result.status,
        title: "Kurir dibooking",
        description: `${order.courierName} ${order.courierServiceName}${result.courier.waybill_id ? ` · resi ${result.courier.waybill_id}` : ""} · pickup ${this.formatWib(pickupAt)} WIB`,
        actorUserId,
        occurredAt: new Date(),
      });
      logger.info({ orderId: order.id, code: order.code, biteshipOrderId: result.id, waybill: result.courier.waybill_id }, "[shipment] booked");
    } catch (error) {
      const message = error instanceof ShippingProviderException ? (error.detail ?? error.message) : error instanceof Error ? error.message : String(error);
      const attempts = order.shipmentAttempts + 1;
      await this.orderRepository.update(order.id, { shipmentAttempts: attempts, shipmentError: message.slice(0, 255) });
      await this.eventRepository.store({
        orderId: order.id,
        type: OrderEventTypeEnum.note,
        title: "Booking kurir gagal",
        description: message.slice(0, 500),
        isPublic: false,
        actorUserId,
        occurredAt: new Date(),
      });
      logger.error({ err: error, orderId: order.id, attempts }, "[shipment] booking failed");
      // Beri tahu admin sekali (percobaan pertama) dan saat percobaan otomatis habis.
      if (attempts === 1 || attempts === MAX_AUTO_BOOKING_ATTEMPTS) {
        await this.notificationService.notify({
          type: NotificationTypeEnum.shipment_failed,
          title: `Booking kurir gagal: ${order.code}`,
          body: message.slice(0, 300),
          link: `/orders/${order.code}`,
          orderId: order.id,
          warehouseId: order.warehouseId,
        });
      }
    }
    return (await this.orderRepository.findById(order.id))!;
  }

  // Booking ulang manual oleh admin (setelah memperbaiki data gudang, dsb.).
  async rebook(order: OrderType, actorUserId: number): Promise<OrderType> {
    if (order.biteshipOrderId) throw new BadRequestException("This order already has a courier booking");
    if (order.status !== OrderStatusEnum.processing) throw new BadRequestException("Only orders being processed can be booked");
    const result = await this.book(order.id, actorUserId);
    if (!result.biteshipOrderId) throw new BadRequestException(`Courier booking failed: ${result.shipmentError ?? "unknown error"}`);
    return result;
  }

  // Batalkan booking sebelum paket dijemput (pesanan ditolak admin). Paket yang sudah dijemput tidak bisa dibatalkan.
  async cancelBooking(order: OrderType, reason: string): Promise<void> {
    if (!order.biteshipOrderId) return;
    if (order.shippingStatus && PICKED_UP_STATUSES.includes(order.shippingStatus))
      throw new BadRequestException("The parcel has already been picked up by the courier");
    await this.biteship.cancelOrder(order.biteshipOrderId, reason);
    await this.orderRepository.update(order.id, { shippingStatus: "cancelled", trackedAt: new Date() });
  }

  // Webhook Biteship (order.status / order.waybill_id / order.price).
  async handleWebhook(payload: BiteshipWebhookPayloadType): Promise<{ handled: boolean }> {
    if (!payload.order_id) return { handled: false };
    const order = await this.orderRepository.findByBiteshipOrderId(payload.order_id);
    if (!order) {
      logger.warn({ biteshipOrderId: payload.order_id, event: payload.event }, "[shipment] webhook for unknown order");
      return { handled: false };
    }
    await this.applyUpdate(order, {
      status: payload.status ?? order.shippingStatus ?? "confirmed",
      waybillId: payload.courier_waybill_id,
      trackingId: payload.courier_tracking_id,
      driverName: payload.courier_driver_name,
      driverPhone: payload.courier_driver_phone,
      link: payload.courier_link,
      occurredAt: payload.updated_at ? new Date(payload.updated_at) : new Date(),
    });
    return { handled: true };
  }

  /**
   * Terapkan update kurir ke pesanan: simpan data kurir, catat riwayat, lalu pindahkan status pesanan.
   * Idempoten: update yang sama (status + waktu) tidak dicatat dua kali; status tidak pernah mundur.
   */
  async applyUpdate(order: OrderType, update: ShippingUpdateType): Promise<OrderType> {
    const changes: Partial<NewOrderType> = { shippingStatus: update.status, trackedAt: new Date() };
    if (update.waybillId) changes.waybillId = update.waybillId;
    if (update.trackingId) changes.courierTrackingId = update.trackingId;
    if (update.driverName !== undefined && update.driverName !== null) changes.courierDriverName = update.driverName;
    if (update.driverPhone !== undefined && update.driverPhone !== null) changes.courierDriverPhone = update.driverPhone;
    if (update.link) changes.courierLink = update.link;
    await this.orderRepository.update(order.id, changes);

    const occurredAt = Number.isNaN(update.occurredAt.getTime()) ? new Date() : update.occurredAt;
    // Rekonsiliasi yang tidak menemukan perubahan status tidak menambah riwayat.
    const isNewStatus = update.status !== order.shippingStatus;
    if ((isNewStatus || update.note) && !(await this.eventRepository.trackingExists(order.id, update.status, occurredAt))) {
      await this.eventRepository.store({
        orderId: order.id,
        type: OrderEventTypeEnum.tracking,
        status: update.status,
        title: biteshipStatusLabel(update.status),
        description: update.note ?? (update.driverName ? `Kurir: ${update.driverName}` : null),
        occurredAt,
      });
    }

    const target = mapBiteshipStatus(update.status);
    if (target && target !== order.status) await this.moveStatus(order, target, update.status);
    return (await this.orderRepository.findById(order.id))!;
  }

  // Rekonsiliasi berkala (job): tanya status pesanan yang masih dalam pengiriman ke Biteship.
  async reconcile(now: Date = new Date()): Promise<number> {
    if (biteshipConfig.mockOrders) return 0;
    const orders = await this.orderRepository.findForTracking(IN_DELIVERY_STATUSES, new Date(now.getTime() - biteshipConfig.trackingIntervalMs));
    let updated = 0;
    for (const order of orders) {
      try {
        const remote = await this.biteship.getOrder(order.biteshipOrderId!);
        if (!remote) continue;
        const before = order.shippingStatus;
        await this.applyUpdate(order, {
          status: remote.status,
          waybillId: remote.courier.waybill_id,
          trackingId: remote.courier.tracking_id,
          link: remote.courier.link,
          occurredAt: before === remote.status ? (order.trackedAt ?? now) : now,
        });
        if (before !== remote.status) updated += 1;
      } catch (error) {
        logger.warn({ err: error, orderId: order.id }, "[shipment] reconcile failed");
        await this.orderRepository.update(order.id, { trackedAt: now });
      }
    }
    return updated;
  }

  // Job: booking ulang otomatis pesanan Diproses yang belum berhasil dibooking (jeda bertambah tiap percobaan).
  async retryPendingBookings(now: Date = new Date()): Promise<number> {
    const pending = await this.orderRepository.findPendingBookings(MAX_AUTO_BOOKING_ATTEMPTS);
    let booked = 0;
    for (const order of pending) {
      const backoffMs = Math.min(2 ** order.shipmentAttempts, 60) * 60 * 1000;
      if (order.shipmentAttempts > 0 && now.getTime() - order.updatedAt.getTime() < backoffMs) continue;
      const result = await this.book(order.id);
      if (result.biteshipOrderId) booked += 1;
    }
    return booked;
  }

  // Development/demo (BITESHIP_MOCK_ORDERS): majukan pengiriman satu langkah lewat jalur webhook yang sama.
  async simulateNext(order: OrderType): Promise<OrderType> {
    if (isProduction() || !biteshipConfig.mockOrders) throw new BadRequestException("Shipping simulation is only available with BITESHIP_MOCK_ORDERS");
    if (!order.biteshipOrderId) throw new BadRequestException("Book the courier first");
    const next = nextMockStatus(order.shippingStatus);
    if (!next) throw new BadRequestException("The parcel has already been delivered");
    return await this.applyUpdate(order, {
      status: next.status,
      note: next.note,
      driverName: next.status === "allocated" ? "Budi (kurir simulasi)" : undefined,
      driverPhone: next.status === "allocated" ? "081200000000" : undefined,
      occurredAt: new Date(),
    });
  }

  private async moveStatus(order: OrderType, target: OrderStatusType, shippingStatus: string): Promise<void> {
    const current = order.status;
    const currentRank = FORWARD_RANK[current];
    const targetRank = FORWARD_RANK[target];
    // Maju di jalur normal, atau keluar jalur (dikembalikan / perlu tindakan) dari status pengiriman mana pun.
    const allowed =
      targetRank !== undefined
        ? (currentRank !== undefined && targetRank > currentRank) || current === OrderStatusEnum.needs_action
        : IN_DELIVERY_STATUSES.includes(current);
    if (!allowed) return;

    const now = new Date();
    const data: Partial<NewOrderType> = { status: target };
    if (target === OrderStatusEnum.shipped && !order.shippedAt) data.shippedAt = now;
    if (target === OrderStatusEnum.completed) Object.assign(data, { deliveredAt: now, completedAt: now, shippedAt: order.shippedAt ?? now });
    const changed = await this.orderRepository.transition(order.id, [current], data);
    if (!changed) return;

    await this.eventRepository.store({
      orderId: order.id,
      type: OrderEventTypeEnum.status,
      status: target,
      title: this.statusTitle(target, shippingStatus),
      occurredAt: now,
    });
    const updated = (await this.orderRepository.findById(order.id))!;

    if (target === OrderStatusEnum.shipped && !order.shippedAt) await this.orderMail.toBuyer("shipped", updated);
    if (target === OrderStatusEnum.completed) {
      await this.orderMail.toBuyer("completed", updated);
      await this.notificationService.notify({
        type: NotificationTypeEnum.order_completed,
        title: `Pesanan selesai: ${order.code}`,
        body: `Paket diterima ${order.recipientName} (${order.city}).`,
        link: `/orders/${order.code}`,
        orderId: order.id,
        warehouseId: order.warehouseId,
      });
    }
    if (target === OrderStatusEnum.returned) {
      if (shippingStatus === "returned") await this.stockService.returnOrder(updated, StockMovementTypeEnum.return);
      await this.notificationService.notify({
        type: NotificationTypeEnum.order_returned,
        title: `Paket dikembalikan: ${order.code}`,
        body: `Status kurir: ${biteshipStatusLabel(shippingStatus)}.`,
        link: `/orders/${order.code}`,
        orderId: order.id,
        warehouseId: order.warehouseId,
      });
    }
    if (target === OrderStatusEnum.needs_action) {
      await this.notificationService.notify({
        type: NotificationTypeEnum.order_needs_action,
        title: `Pengiriman bermasalah: ${order.code}`,
        body: `Status kurir: ${biteshipStatusLabel(shippingStatus)}. Booking ulang atau tolak & refund.`,
        link: `/orders/${order.code}`,
        orderId: order.id,
        warehouseId: order.warehouseId,
      });
      // Booking yang batal/ditolak kurir dilepas supaya admin bisa booking ulang.
      if (["cancelled", "rejected", "courier_not_found", "disposed"].includes(shippingStatus)) {
        await this.orderRepository.update(order.id, { biteshipOrderId: null });
      }
    }
  }

  private statusTitle(status: OrderStatusType, shippingStatus: string): string {
    switch (status) {
      case OrderStatusEnum.awaiting_pickup:
        return "Menunggu dijemput kurir";
      case OrderStatusEnum.shipped:
        return "Pesanan dikirim";
      case OrderStatusEnum.completed:
        return "Pesanan selesai";
      case OrderStatusEnum.returned:
        return shippingStatus === "returned" ? "Paket kembali ke gudang" : "Paket dikembalikan";
      case OrderStatusEnum.needs_action:
        return "Pengiriman perlu ditangani toko";
      default:
        return "Pesanan diproses";
    }
  }

  private async buildRequest(order: OrderType): Promise<{ request: BiteshipCreateOrderRequestType; pickupAt: Date }> {
    const [warehouse, items, settings, buyer] = await Promise.all([
      this.warehouseRepository.findById(order.warehouseId),
      this.orderRepository.findItems([order.id]),
      this.settingRepository.getAll(),
      this.userRepository.findById(order.userId),
    ]);
    if (!warehouse?.biteshipAreaId) throw new Error(`Gudang ${warehouse?.name ?? order.warehouseId} belum punya area Biteship`);
    const originPhone = warehouse.picPhone || settings.store_whatsapp;
    if (!originPhone) throw new Error(`Isi nomor HP PIC gudang ${warehouse.name} (atau WhatsApp toko di Pengaturan) untuk dihubungi kurir`);

    const { date, time, at } = this.pickupSlot(warehouse.pickupTime);
    const request: BiteshipCreateOrderRequestType = {
      shipper_contact_name: settings.store_name,
      shipper_contact_phone: settings.store_whatsapp || originPhone,
      shipper_contact_email: settings.store_email || undefined,
      shipper_organization: settings.store_name,
      origin_contact_name: warehouse.picName || settings.store_name,
      origin_contact_phone: originPhone,
      origin_address: warehouse.address,
      origin_note: warehouse.name,
      origin_postal_code: warehouse.postalCode ? Number(warehouse.postalCode) : undefined,
      origin_area_id: warehouse.biteshipAreaId,
      ...(warehouse.latitude !== null && warehouse.longitude !== null
        ? { origin_coordinate: { latitude: warehouse.latitude, longitude: warehouse.longitude } }
        : {}),
      destination_contact_name: order.recipientName,
      destination_contact_phone: order.recipientPhone,
      destination_contact_email: buyer?.email,
      destination_address: `${order.address}, ${order.district}, ${order.city}, ${order.province}`,
      destination_postal_code: Number(order.postalCode),
      destination_area_id: order.biteshipAreaId,
      destination_note: order.addressNotes ?? undefined,
      courier_company: order.courierCode,
      courier_type: order.courierServiceCode,
      ...(order.insuredValue ? { courier_insurance: order.insuredValue } : {}),
      delivery_type: "scheduled",
      delivery_date: date,
      delivery_time: time,
      order_note: `Pesanan Ortic ${order.code}`,
      reference_id: order.code,
      metadata: { ortic_order_id: order.id },
      items: items.map((item) => ({
        name: item.variantName ? `${item.productName} (${item.variantName})` : item.productName,
        sku: item.sku,
        category: "healthcare",
        value: item.price,
        quantity: item.quantity,
        weight: item.weightGram,
      })),
    };
    return { request, pickupAt: at };
  }

  // Slot pickup berikutnya (WIB): hari ini bila masih ada waktu sebelum jam pickup gudang, selain itu besok; Minggu -> Senin.
  private pickupSlot(pickupTime: string): { date: string; time: string; at: Date } {
    const [hour, minute] = pickupTime.split(":").map(Number);
    const nowWib = new Date(Date.now() + WIB_OFFSET_MS);
    const slot = new Date(Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth(), nowWib.getUTCDate(), hour, minute));
    if (slot.getTime() - nowWib.getTime() < PICKUP_LEAD_MINUTES * 60 * 1000) slot.setUTCDate(slot.getUTCDate() + 1);
    if (slot.getUTCDay() === 0) slot.setUTCDate(slot.getUTCDate() + 1);
    const iso = slot.toISOString();
    return { date: iso.slice(0, 10), time: iso.slice(11, 16), at: new Date(slot.getTime() - WIB_OFFSET_MS) };
  }

  private formatWib(date: Date): string {
    const wib = new Date(date.getTime() + WIB_OFFSET_MS).toISOString();
    return `${wib.slice(8, 10)}/${wib.slice(5, 7)} ${wib.slice(11, 16)}`;
  }
}

export { IN_DELIVERY_STATUSES };
