import { index, json, mysqlEnum, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { AUDIT_ACTIONS, AUDIT_SOURCES } from "../enums/audit.enum";
import { foreignId, id } from "./common/id.column";
import { users } from "./user.model";

// Jejak aksi admin (ubah role, tema, paket). Hanya ditambah, tidak pernah diubah.
export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: id(),
    // NULL jika aksi dari CLI, atau user pelakunya sudah dihapus.
    actorUserId: foreignId("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    source: mysqlEnum("source", AUDIT_SOURCES).notNull(),
    action: mysqlEnum("action", AUDIT_ACTIONS).notNull(),
    targetType: varchar("target_type", { length: 32 }).notNull(),
    targetId: varchar("target_id", { length: 64 }),
    // Detail perubahan, mis. { before: {...}, after: {...} }.
    metadata: json("metadata").$type<Record<string, unknown>>(),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("audit_logs_actor_user_id_idx").on(table.actorUserId), index("audit_logs_action_created_at_idx").on(table.action, table.createdAt)]
);
