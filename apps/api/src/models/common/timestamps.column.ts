import { timestamp } from "drizzle-orm/mysql-core";

// Kolom audit standar yang dipakai ulang di setiap tabel: `...timestamps`
export const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
};
