import { AnyMySqlColumn, boolean, mysqlEnum, mysqlTable, varchar } from "drizzle-orm/mysql-core";
// PENTING: file model dibaca langsung oleh drizzle-kit, gunakan relative import (bukan alias @xxx).
import UserRoleEnum, { USER_ROLES } from "../enums/user-role.enum";
import { foreignId, id } from "./common/id.column";
import { timestamps } from "./common/timestamps.column";
import { warehouses } from "./warehouse.model";

// User login lewat Google (`google_sub`) atau kode OTP email. Email selalu sudah terverifikasi (oleh Google atau OTP),
// unik, dan disimpan lowercase. Login Google pertama menghubungkan akun Google ke user dengan email yang sama.
// Role: user = pembeli, admin = Staf, superadmin = Owner.
export const users = mysqlTable("users", {
  id: id(),
  // NULL = belum pernah login dengan Google (daftar lewat OTP email atau dibuat lewat CLI admin).
  googleSub: varchar("google_sub", { length: 64 }).unique(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  // Nomor WhatsApp, wajib saat checkout (untuk kurir).
  phone: varchar("phone", { length: 20 }),
  // Dokter gigi, mahasiswa FKG, klinik, dll. (opsional).
  profession: varchar("profession", { length: 50 }),
  role: mysqlEnum("role", USER_ROLES).notNull().default(UserRoleEnum.user),
  // Staf yang dikaitkan ke satu gudang hanya melihat pesanan gudang itu; NULL = semua gudang.
  warehouseId: foreignId("warehouse_id").references((): AnyMySqlColumn => warehouses.id, { onDelete: "set null" }),
  isBlocked: boolean("is_blocked").notNull().default(false),
  ...timestamps,
});
