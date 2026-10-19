import { datetime, index, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { foreignId } from "./common/id.column";
import { users } from "./user.model";

/**
 * Satu sesi login (satu perangkat) = satu refresh token yang dirotasi.
 * - `id` (acak, bukan rahasia) ada di klaim `sid` access token dan di awal refresh token (`<id>.<secret>`).
 * - Hanya hash SHA-256 bagian rahasia refresh token yang disimpan: yang berlaku sekarang dan yang sebelumnya.
 *   Yang sebelumnya dipakai untuk membedakan retry jaringan (dalam grace period) dari pencurian (di luarnya).
 * - Menghapus baris = mencabut sesi: access token yang masih berlaku ikut ditolak karena setiap request mengecek tabel ini.
 */
export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: foreignId("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    refreshTokenHash: varchar("refresh_token_hash", { length: 64 }).notNull(),
    previousRefreshTokenHash: varchar("previous_refresh_token_hash", { length: 64 }),
    // Kapan refresh token terakhir dirotasi (awal grace period untuk token sebelumnya).
    rotatedAt: datetime("rotated_at"),
    // Login / refresh terakhir: dasar idle timeout dan pilihan sesi yang dikeluarkan saat melebihi batas perangkat.
    lastUsedAt: datetime("last_used_at").notNull(),
    // Absolut sejak login; refresh tidak memperpanjang.
    expiresAt: datetime("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("sessions_user_id_last_used_at_idx").on(table.userId, table.lastUsedAt)]
);
