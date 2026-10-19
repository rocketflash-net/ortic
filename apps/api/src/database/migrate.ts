import "../paths";
import path from "path";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { db, closeDatabaseConnection } from "@config/database.config";

/**
 * Runner migration programmatic (tanpa drizzle-kit).
 * Dipakai di server production setelah `npm run build`: `npm run db:migrate:prod`
 */
const run = async (): Promise<void> => {
  const migrationsFolder = path.resolve(__dirname, "migrations");
  console.log(`[migrate] running migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder, migrationsTable: "__drizzle_migrations" });
  console.log("[migrate] done");
};

run()
  .catch((error) => {
    console.error("[migrate] failed", error);
    process.exitCode = 1;
  })
  .finally(closeDatabaseConnection);
