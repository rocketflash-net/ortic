import { int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { foreignId, id } from "./common/id.column";
import { products } from "./product.model";

export const productImages = mysqlTable("product_images", {
  id: id(),
  productId: foreignId("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  // Key object storage (untuk hapus) dan URL publiknya.
  storageKey: varchar("storage_key", { length: 300 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
