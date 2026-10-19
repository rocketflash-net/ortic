import { boolean, decimal, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";
import { id } from "./common/id.column";
import { timestamps } from "./common/timestamps.column";

// Gudang asal pengiriman (Pekanbaru, Medan, ...). Alamat & koordinat diisi admin di Pengaturan Gudang.
export const warehouses = mysqlTable("warehouses", {
  id: id(),
  // Kode singkat untuk label & nomor order, mis. "PKU", "MDN".
  code: varchar("code", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  address: text("address").notNull(),
  province: varchar("province", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  district: varchar("district", { length: 100 }),
  postalCode: varchar("postal_code", { length: 10 }),
  // Area Biteship (GET /v1/maps/areas); NULL = belum dipilih admin, gudang belum bisa dipakai cek ongkir.
  biteshipAreaId: varchar("biteship_area_id", { length: 64 }),
  // Wajib untuk kurir instan; opsional untuk kurir reguler.
  latitude: decimal("latitude", { precision: 10, scale: 7, mode: "number" }),
  longitude: decimal("longitude", { precision: 10, scale: 7, mode: "number" }),
  picName: varchar("pic_name", { length: 100 }),
  picPhone: varchar("pic_phone", { length: 20 }),
  // Jam pickup kurir (WIB, HH:mm) untuk order Biteship terjadwal.
  pickupTime: varchar("pickup_time", { length: 5 }).notNull().default("13:00"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});
