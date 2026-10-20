import { index, int, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { foreignId, id } from "./common/id.column";
import { orders } from "./order.model";
import { productVariants } from "./product-variant.model";
import { products } from "./product.model";

// Baris pesanan: snapshot nama, SKU, dan harga saat checkout.
export const orderItems = mysqlTable(
  "order_items",
  {
    id: id(),
    orderId: foreignId("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: foreignId("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: foreignId("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    productName: varchar("product_name", { length: 200 }).notNull(),
    productSlug: varchar("product_slug", { length: 220 }).notNull(),
    variantName: varchar("variant_name", { length: 150 }),
    sku: varchar("sku", { length: 64 }).notNull(),
    imageUrl: varchar("image_url", { length: 500 }),
    price: int("price", { unsigned: true }).notNull(),
    // Harga dasar saat checkout (untuk laporan laba). NULL untuk pesanan sebelum kolom ini ada.
    basePrice: int("base_price", { unsigned: true }),
    quantity: int("quantity", { unsigned: true }).notNull(),
    weightGram: int("weight_gram", { unsigned: true }).notNull(),
    subtotal: int("subtotal", { unsigned: true }).notNull(),
  },
  (table) => [index("order_items_order_id_idx").on(table.orderId)]
);
