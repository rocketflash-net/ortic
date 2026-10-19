import "../paths";
import { db, closeDatabaseConnection } from "@config/database.config";
import { DatabaseExecutorType } from "@@types/database.type";
import categorySeeder from "@database/seeders/category.seeder";
import courierSeeder from "@database/seeders/courier.seeder";
import settingSeeder from "@database/seeders/setting.seeder";
import warehouseSeeder from "@database/seeders/warehouse.seeder";

type SeederType = {
  name: string;
  run: (executor: DatabaseExecutorType) => Promise<void>;
};

// Urutan penting: seeder tabel master/parent harus dijalankan lebih dulu.
// User tidak di-seed karena dibuat otomatis saat login pertama; admin dibuat lewat `npm run admin -- grant <email>`.
const seeders: SeederType[] = [warehouseSeeder, courierSeeder, settingSeeder, categorySeeder];

const run = async (): Promise<void> => {
  await db.transaction(async (tx) => {
    for (const seeder of seeders) {
      console.log(`[seed] ${seeder.name}`);
      await seeder.run(tx);
    }
  });
  console.log("[seed] done");
};

run()
  .catch((error) => {
    console.error("[seed] failed", error);
    process.exitCode = 1;
  })
  .finally(closeDatabaseConnection);
