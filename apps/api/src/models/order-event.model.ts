import { boolean, datetime, index, mysqlEnum, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { ORDER_EVENT_TYPES } from "../enums/order-event-type.enum";
import { foreignId, id } from "./common/id.column";
import { orders } from "./order.model";
import { users } from "./user.model";

// Riwayat pesanan: perubahan status, update kurir (tracking), dan catatan admin. Hanya ditambah, tidak pernah diubah.
export const orderEvents = mysqlTable(
  "order_events",
  {
    id: id(),
    orderId: foreignId("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ORDER_EVENT_TYPES).notNull(),
    // Status Ortic (type=status) atau status Biteship (type=tracking).
    status: varchar("status", { length: 32 }),
    title: varchar("title", { length: 150 }).notNull(),
    description: varchar("description", { length: 500 }),
    // false = hanya terlihat di dashboard admin.
    isPublic: boolean("is_public").notNull().default(true),
    actorUserId: foreignId("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    // Waktu kejadian (dari kurir untuk tracking), bisa lebih awal dari created_at.
    occurredAt: datetime("occurred_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("order_events_order_id_occurred_at_idx").on(table.orderId, table.occurredAt)]
);
