import { sql } from "drizzle-orm";
import { warehouses } from "@models/warehouse.model";
import { DatabaseExecutorType } from "@@types/database.type";
import { NewWarehouseType } from "@@types/entity.type";

// Gudang awal. Alamat lengkap, kode pos, area Biteship, titik koordinat, dan PIC dilengkapi admin di Pengaturan Gudang.
// Gudang Medan ditambahkan admin dari dashboard.
const data: NewWarehouseType[] = [
  {
    code: "PKU",
    name: "Gudang Pekanbaru",
    address: "Villa Mas Permai, Pekanbaru",
    province: "Riau",
    city: "Pekanbaru",
    pickupTime: "13:00",
  },
];

export default {
  name: "warehouse.seeder",
  // Idempotent: hanya mengisi jika kode belum ada, data yang sudah diubah admin tidak ditimpa.
  run: async (executor: DatabaseExecutorType): Promise<void> => {
    await executor
      .insert(warehouses)
      .values(data)
      .onDuplicateKeyUpdate({ set: { code: sql`${warehouses.code}` } });
  },
};
