import { boolean, datetime, decimal, index, json, mysqlEnum, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";
import ProductStatusEnum, { PRODUCT_STATUSES } from "../enums/product-status.enum";
import { brands } from "./brand.model";
import { categories } from "./category.model";
import { foreignId, id } from "./common/id.column";
import { timestamps } from "./common/timestamps.column";

export const products = mysqlTable(
  "products",
  {
    id: id(),
    categoryId: foreignId("category_id")
      .notNull()
      .references(() => categories.id),
    brandId: foreignId("brand_id").references(() => brands.id, { onDelete: "set null" }),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    description: text("description"),
    // Spesifikasi bebas, mis. { "Bahan": "Stainless", "Panjang": "16 cm" }.
    specifications: json("specifications").$type<Record<string, string>>(),
    // Nomor izin edar AKD/AKL (opsional).
    permitNumber: varchar("permit_number", { length: 64 }),
    // Bahan cair/kimia (mis. alkohol 96%): hanya ditawarkan kurir yang menerima.
    isHazardous: boolean("is_hazardous").notNull().default(false),
    // Periode harga promo (product_variants.sale_price). NULL = tanpa batas di sisi itu; keduanya NULL = promo selalu berlaku.
    saleStartsAt: datetime("sale_starts_at"),
    saleEndsAt: datetime("sale_ends_at"),
    // Markup khusus produk (%); NULL = pakai markup kategori / global.
    markupPercent: decimal("markup_percent", { precision: 5, scale: 2, mode: "number" }),
    status: mysqlEnum("status", PRODUCT_STATUSES).notNull().default(ProductStatusEnum.draft),
    ...timestamps,
  },
  (table) => [index("products_category_id_status_idx").on(table.categoryId, table.status)]
);
