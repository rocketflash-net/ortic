import Service from "@base/service.base";
import ValidationException from "@exceptions/validation.exception";
import CartRepository from "@repositories/cart.repository";
import CatalogRepository from "@repositories/catalog.repository";
import ProductRepository from "@repositories/product.repository";
import StockRepository from "@repositories/stock.repository";
import WarehouseRepository from "@repositories/warehouse.repository";
import ResponseType from "@@types/response.type";
import { displayCompareAtPrice, effectivePrice } from "@utils/price.util";
import { MAX_CART_LINES, MergeCartInputType, SetCartItemInputType } from "@validators/checkout.validator";

const MAX_QUANTITY = 99;

type CartLineResponseType = {
  variant_id: number;
  product_id: number | null;
  product_name: string;
  product_slug: string | null;
  variant_name: string | null;
  sku: string | null;
  image_url: string | null;
  price: number;
  compare_at_price: number | null;
  weight_gram: number;
  quantity: number;
  // Stok tersedia terbanyak di satu gudang (checkout dikirim dari satu gudang).
  max_quantity: number;
  is_available: boolean;
};

/**
 * Keranjang pembeli yang login, disimpan di server supaya sama di semua perangkat. Tamu memakai localStorage lalu
 * keranjangnya digabung ke sini saat login (POST /cart/merge). Harga & stok selalu dihitung ulang dari database;
 * jumlah dibatasi stok tersedia.
 */
export default class CartService extends Service {
  constructor(
    private readonly cartRepository: CartRepository = new CartRepository(),
    private readonly catalogRepository: CatalogRepository = new CatalogRepository(),
    private readonly productRepository: ProductRepository = new ProductRepository(),
    private readonly stockRepository: StockRepository = new StockRepository(),
    private readonly warehouseRepository: WarehouseRepository = new WarehouseRepository()
  ) {
    super();
  }

  async show(userId: number): Promise<ResponseType> {
    return this.success(await this.lines(userId));
  }

  // Ubah jumlah satu varian; 0 = hapus. Jumlah di atas stok dipotong ke stok tersedia.
  async setItem(userId: number, input: SetCartItemInputType): Promise<ResponseType> {
    if (input.quantity === 0) {
      await this.cartRepository.removeVariants(userId, [input.variant_id]);
      return this.success(await this.lines(userId), "Cart updated");
    }

    const [variant] = await this.catalogRepository.findSellableVariants([input.variant_id]);
    if (!variant) throw new ValidationException([{ field: "variant_id", message: "This item is no longer available" }]);
    const existing = await this.cartRepository.findByUser(userId);
    if (!existing.some((item) => item.variantId === input.variant_id) && existing.length >= MAX_CART_LINES) {
      throw new ValidationException([{ field: "variant_id", message: `A cart can hold at most ${MAX_CART_LINES} different items` }]);
    }

    const max = (await this.maxQuantities([input.variant_id])).get(input.variant_id) ?? 0;
    if (max <= 0) throw new ValidationException([{ field: "quantity", message: "Out of stock", available: 0 }]);
    await this.cartRepository.upsert(userId, input.variant_id, Math.min(input.quantity, max, MAX_QUANTITY));
    return this.success(await this.lines(userId), "Cart updated");
  }

  // Gabungkan keranjang tamu: jumlah dijumlahkan dengan isi keranjang server, dibatasi stok. Barang tak tersedia dilewati.
  async merge(userId: number, input: MergeCartInputType): Promise<ResponseType> {
    if (input.items.length) {
      const existing = new Map((await this.cartRepository.findByUser(userId)).map((item) => [item.variantId, item.quantity]));
      const sellable = new Set(
        (await this.catalogRepository.findSellableVariants(input.items.map((item) => item.variant_id))).map((variant) => variant.variantId)
      );
      const max = await this.maxQuantities(input.items.map((item) => item.variant_id));
      for (const item of input.items) {
        if (!sellable.has(item.variant_id) || (max.get(item.variant_id) ?? 0) <= 0) continue;
        if (!existing.has(item.variant_id) && existing.size >= MAX_CART_LINES) continue;
        const quantity = Math.min((existing.get(item.variant_id) ?? 0) + item.quantity, max.get(item.variant_id)!, MAX_QUANTITY);
        await this.cartRepository.upsert(userId, item.variant_id, quantity);
        existing.set(item.variant_id, quantity);
      }
    }
    return this.success(await this.lines(userId), "Cart merged");
  }

  async clear(userId: number): Promise<ResponseType> {
    await this.cartRepository.clear(userId);
    return this.success([], "Cart cleared");
  }

  private async lines(userId: number): Promise<CartLineResponseType[]> {
    const items = await this.cartRepository.findByUser(userId);
    if (items.length === 0) return [];
    const variantIds = items.map((item) => item.variantId);
    const [variants, max, labels] = await Promise.all([
      this.catalogRepository.findSellableVariants(variantIds),
      this.maxQuantities(variantIds),
      this.productRepository.findVariantLabels(variantIds),
    ]);
    const byId = new Map(variants.map((variant) => [variant.variantId, variant]));
    const images = await this.productRepository.primaryImages([...new Set(variants.map((variant) => variant.productId))]);
    const now = new Date();

    return items.map((item) => {
      const variant = byId.get(item.variantId);
      const maxQuantity = Math.min(max.get(item.variantId) ?? 0, MAX_QUANTITY);
      if (!variant) {
        return {
          variant_id: item.variantId,
          product_id: null,
          product_name: labels.get(item.variantId) ?? "Produk tidak tersedia",
          product_slug: null,
          variant_name: null,
          sku: null,
          image_url: null,
          price: 0,
          compare_at_price: null,
          weight_gram: 0,
          quantity: item.quantity,
          max_quantity: 0,
          is_available: false,
        };
      }
      return {
        variant_id: variant.variantId,
        product_id: variant.productId,
        product_name: variant.productName,
        product_slug: variant.productSlug,
        variant_name: variant.variantName,
        sku: variant.sku,
        image_url: images.get(variant.productId) ?? null,
        price: effectivePrice(variant, variant, now),
        compare_at_price: displayCompareAtPrice(variant, variant, now),
        weight_gram: variant.weightGram,
        quantity: item.quantity,
        max_quantity: maxQuantity,
        is_available: maxQuantity > 0,
      };
    });
  }

  // Stok tersedia terbanyak di satu gudang siap kirim, per varian.
  private async maxQuantities(variantIds: number[]): Promise<Map<number, number>> {
    const warehouses = (await this.warehouseRepository.findAll()).filter((warehouse) => warehouse.isActive && warehouse.biteshipAreaId);
    const availability = await this.stockRepository.availability(
      variantIds,
      warehouses.map((warehouse) => warehouse.id)
    );
    return new Map(variantIds.map((id) => [id, Math.max(0, ...(availability.get(id)?.values() ?? []))]));
  }
}
