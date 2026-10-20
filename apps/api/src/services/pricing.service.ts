import { and, eq } from "drizzle-orm";
import { db } from "@config/database.config";
import { categories } from "@models/category.model";
import { productVariants } from "@models/product-variant.model";
import { products } from "@models/product.model";
import { DatabaseExecutorType } from "@@types/database.type";
import { effectiveMarkup, sellingPrice } from "@utils/price.util";

type RepriceOverridesType = {
  // Nilai baru yang belum disimpan (pratinjau) atau baru saja disimpan.
  markupPercent?: number;
  priceRounding?: number;
  // Markup kategori baru untuk satu kategori (null = kembali ke markup global).
  category?: { id: number; markupPercent: number | null };
};

type RepriceChangeType = { variantId: number; productId: number; productName: string; variantName: string | null; sku: string; before: number; after: number };

/**
 * Hitung ulang harga jual varian yang tidak dikunci setelah markup global, pembulatan, atau markup kategori berubah.
 * Harga jual = harga dasar x (1 + markup varian -> produk -> kategori -> global), dibulatkan ke atas.
 */
export default class PricingService {
  // Varian yang harganya berubah bila `overrides` diterapkan (tanpa menyimpan).
  async preview(
    globalMarkup: number,
    rounding: number,
    overrides: RepriceOverridesType = {},
    executor: DatabaseExecutorType = db
  ): Promise<RepriceChangeType[]> {
    const markup = overrides.markupPercent ?? globalMarkup;
    const step = overrides.priceRounding ?? rounding;
    const rows = await executor
      .select({
        variantId: productVariants.id,
        productId: products.id,
        productName: products.name,
        variantName: productVariants.name,
        sku: productVariants.sku,
        basePrice: productVariants.basePrice,
        price: productVariants.price,
        variantMarkup: productVariants.markupPercent,
        productMarkup: products.markupPercent,
        categoryId: categories.id,
        categoryMarkup: categories.markupPercent,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(and(eq(productVariants.priceLocked, false), overrides.category ? eq(categories.id, overrides.category.id) : undefined));

    return rows.flatMap((row) => {
      const categoryMarkup = overrides.category && overrides.category.id === row.categoryId ? overrides.category.markupPercent : row.categoryMarkup;
      const after = sellingPrice(row.basePrice, effectiveMarkup(row.variantMarkup, row.productMarkup, markup, categoryMarkup), step);
      return after === row.price
        ? []
        : [
            {
              variantId: row.variantId,
              productId: row.productId,
              productName: row.productName,
              variantName: row.variantName,
              sku: row.sku,
              before: row.price,
              after,
            },
          ];
    });
  }

  // Simpan harga baru (di dalam transaction yang sama dengan perubahan pengaturannya).
  async apply(executor: DatabaseExecutorType, changes: RepriceChangeType[]): Promise<void> {
    for (const change of changes) await executor.update(productVariants).set({ price: change.after }).where(eq(productVariants.id, change.variantId));
  }
}

export { type RepriceChangeType, type RepriceOverridesType };
