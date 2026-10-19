import { sql } from "drizzle-orm";
import { couriers } from "@models/courier.model";
import { DatabaseExecutorType } from "@@types/database.type";
import { NewCourierType } from "@@types/entity.type";

// Tiga kurir pertama (batas paket Biteship Starter). Kode = courier_company di API Biteship.
const data: NewCourierType[] = [
  { code: "jne", name: "JNE", sortOrder: 1 },
  { code: "jnt", name: "J&T Express", sortOrder: 2 },
  { code: "sicepat", name: "SiCepat", sortOrder: 3 },
];

export default {
  name: "courier.seeder",
  run: async (executor: DatabaseExecutorType): Promise<void> => {
    await executor
      .insert(couriers)
      .values(data)
      .onDuplicateKeyUpdate({ set: { code: sql`${couriers.code}` } });
  },
};
