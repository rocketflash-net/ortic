import { datetime, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { foreignId, id } from "./common/id.column";
import { users } from "./user.model";

// Kode sekali pakai dari callback Google: dashboard menukarnya ke POST /auth/google/exchange menjadi token,
// supaya token tidak pernah lewat URL. Hanya hash yang disimpan.
export const authExchangeCodes = mysqlTable("auth_exchange_codes", {
  id: id(),
  codeHash: varchar("code_hash", { length: 64 }).notNull().unique(),
  userId: foreignId("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: datetime("expires_at").notNull(),
  consumedAt: datetime("consumed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
