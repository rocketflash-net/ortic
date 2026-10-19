import { boolean, int, json, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { id } from "./common/id.column";
import { timestamps } from "./common/timestamps.column";

// Kurir yang ditawarkan ke pembeli (kode = courier_company Biteship). Paket Biteship Starter: maksimal 3 kurir aktif.
export const couriers = mysqlTable("couriers", {
  id: id(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  // Layanan yang ditampilkan (courier_type Biteship, mis. ["reg", "yes"]); NULL = semua layanan dari Rates API.
  services: json("services").$type<string[]>(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  ...timestamps,
});
