import { int, mysqlTable, uniqueIndex } from "drizzle-orm/mysql-core";
import { foreignId, id } from "./common/id.column";
import { timestamps } from "./common/timestamps.column";
import { productVariants } from "./product-variant.model";
import { users } from "./user.model";

// Keranjang pembeli yang login (tamu memakai localStorage, digabung ke sini saat login). Satu baris per varian.
export const cartItems = mysqlTable(
  "cart_items",
  {
    id: id(),
    userId: foreignId("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    variantId: foreignId("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: int("quantity", { unsigned: true }).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("cart_items_user_variant_unique").on(table.userId, table.variantId)]
);
