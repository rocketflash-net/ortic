import { index, int, mysqlEnum, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { STOCK_MOVEMENT_TYPES } from "../enums/stock-movement-type.enum";
import { foreignId, id } from "./common/id.column";
import { productVariants } from "./product-variant.model";
import { users } from "./user.model";
import { warehouses } from "./warehouse.model";

// Kartu stok: setiap perubahan stok dicatat di sini dan tidak pernah diubah.
export const stockMovements = mysqlTable(
  "stock_movements",
  {
    id: id(),
    warehouseId: foreignId("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    variantId: foreignId("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", STOCK_MOVEMENT_TYPES).notNull(),
    // Positif = masuk, negatif = keluar.
    quantity: int("quantity").notNull(),
    // Sumber mutasi, mis. ("order", "ORT-0001").
    referenceType: varchar("reference_type", { length: 32 }),
    referenceId: varchar("reference_id", { length: 64 }),
    actorUserId: foreignId("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    note: varchar("note", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("stock_movements_variant_created_at_idx").on(table.variantId, table.createdAt)]
);
