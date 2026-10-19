import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ quiet: true });

/**
 * Konfigurasi drizzle-kit (generate / migrate / push / studio).
 * - schema : semua file *.model.ts di src/models
 * - out    : folder hasil generate migration (SQL + snapshot)
 */
export default defineConfig({
  dialect: "mysql",
  schema: "./src/models/*.model.ts",
  out: "./src/database/migrations",
  dbCredentials: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USERNAME ?? "root",
    password: process.env.DB_PASSWORD || undefined,
    database: process.env.DB_DATABASE ?? "ortic",
  },
  migrations: {
    table: "__drizzle_migrations",
  },
  strict: true,
  verbose: true,
});
