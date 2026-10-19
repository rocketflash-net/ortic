import { datetime, index, int, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";
import { id } from "./common/id.column";

// Kode OTP login lewat email. Kode hanya disimpan sebagai hash; satu kode bisa dipakai sekali.
export const emailLoginCodes = mysqlTable(
  "email_login_codes",
  {
    id: id(),
    email: varchar("email", { length: 191 }).notNull(),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    // Jumlah percobaan salah; kode ditolak setelah mencapai batas (AUTH_EMAIL_CODE_MAX_ATTEMPTS).
    attempts: int("attempts").notNull().default(0),
    expiresAt: datetime("expires_at").notNull(),
    // Terisi saat kode berhasil dipakai atau diganti kode baru.
    consumedAt: datetime("consumed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("email_login_codes_email_created_at_idx").on(table.email, table.createdAt)]
);
