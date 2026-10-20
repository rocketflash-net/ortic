import { index, mysqlEnum, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { NOTIFICATION_TYPES } from "../enums/notification-type.enum";
import { foreignId, id } from "./common/id.column";
import { orders } from "./order.model";
import { warehouses } from "./warehouse.model";

// Notifikasi dashboard admin. Status baca per admin memakai users.notifications_read_at.
export const notifications = mysqlTable(
  "notifications",
  {
    id: id(),
    type: mysqlEnum("type", NOTIFICATION_TYPES).notNull(),
    title: varchar("title", { length: 150 }).notNull(),
    body: varchar("body", { length: 500 }),
    // Path di dashboard, mis. /orders/ORT-261020-ABCDE.
    link: varchar("link", { length: 255 }),
    orderId: foreignId("order_id").references(() => orders.id, { onDelete: "cascade" }),
    // Staf yang dikaitkan ke satu gudang hanya melihat notifikasi gudang itu; NULL = semua.
    warehouseId: foreignId("warehouse_id").references(() => warehouses.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("notifications_created_at_idx").on(table.createdAt)]
);
