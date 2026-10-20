import { AnyMySqlColumn, boolean, decimal, int, mysqlEnum, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { CATEGORY_COLORS } from "../enums/category-color.enum";
import { foreignId, id } from "./common/id.column";
import { timestamps } from "./common/timestamps.column";

// Kategori produk, bisa bertingkat. `color` = salah satu dari tiga warna tema (merah/kuning/biru) untuk kartu produk.
export const categories = mysqlTable("categories", {
  id: id(),
  parentId: foreignId("parent_id").references((): AnyMySqlColumn => categories.id, { onDelete: "set null" }),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  color: mysqlEnum("color", CATEGORY_COLORS),
  // Markup khusus kategori (%); NULL = pakai markup global. Urutan: varian -> produk -> kategori -> global.
  markupPercent: decimal("markup_percent", { precision: 5, scale: 2, mode: "number" }),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});
