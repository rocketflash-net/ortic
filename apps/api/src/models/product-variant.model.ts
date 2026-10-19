import { boolean, decimal, int, json, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { foreignId, id } from "./common/id.column";
import { timestamps } from "./common/timestamps.column";
import { products } from "./product.model";

// Unit yang dijual (SKU). Produk tanpa varian tetap punya satu varian default.
export const productVariants = mysqlTable("product_variants", {
  id: id(),
  productId: foreignId("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  // Label varian, mis. "No. 25" atau "Box 100 pcs"; NULL untuk varian default.
  name: varchar("name", { length: 150 }),
  attributes: json("attributes").$type<Record<string, string>>(),
  // Harga dasar (harga termurah di marketplace / harga modal). Hanya terlihat oleh Owner.
  basePrice: int("base_price", { unsigned: true }).notNull(),
  // Markup khusus varian (%); NULL = ikut produk / global.
  markupPercent: decimal("markup_percent", { precision: 5, scale: 2, mode: "number" }),
  // Harga jual = harga dasar x (1 + markup), dibulatkan ke atas; disimpan supaya katalog tidak menghitung ulang.
  price: int("price", { unsigned: true }).notNull(),
  // true = harga jual diisi manual dan tidak ikut berubah saat markup diubah.
  priceLocked: boolean("price_locked").notNull().default(false),
  compareAtPrice: int("compare_at_price", { unsigned: true }),
  weightGram: int("weight_gram", { unsigned: true }).notNull(),
  lengthCm: decimal("length_cm", { precision: 6, scale: 1, mode: "number" }),
  widthCm: decimal("width_cm", { precision: 6, scale: 1, mode: "number" }),
  heightCm: decimal("height_cm", { precision: 6, scale: 1, mode: "number" }),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});
