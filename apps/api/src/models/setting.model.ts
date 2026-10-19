import { json, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

// Pengaturan toko yang diubah admin (markup global, pembulatan harga, biaya layanan, dll). Satu baris per key.
export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: json("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});
