import { boolean, index, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";
import { foreignId, id } from "./common/id.column";
import { timestamps } from "./common/timestamps.column";
import { users } from "./user.model";

// Alamat kirim pembeli. Area Biteship (kecamatan + kode pos) wajib supaya ongkir bisa dihitung.
export const userAddresses = mysqlTable(
  "user_addresses",
  {
    id: id(),
    userId: foreignId("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Mis. "Rumah", "Kampus", "Klinik".
    label: varchar("label", { length: 50 }),
    recipientName: varchar("recipient_name", { length: 100 }).notNull(),
    // Nomor WhatsApp penerima (untuk kurir).
    phone: varchar("phone", { length: 20 }).notNull(),
    address: text("address").notNull(),
    province: varchar("province", { length: 100 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    district: varchar("district", { length: 100 }).notNull(),
    postalCode: varchar("postal_code", { length: 10 }).notNull(),
    biteshipAreaId: varchar("biteship_area_id", { length: 64 }).notNull(),
    // Patokan untuk kurir, mis. "pagar hitam samping masjid".
    notes: varchar("notes", { length: 255 }),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps,
  },
  (table) => [index("user_addresses_user_id_idx").on(table.userId)]
);
