import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { env, envBoolean, envNumber } from "@config/env.config";
import * as schema from "@database/schema";

const databaseConfig = {
  host: env("DB_HOST", "127.0.0.1"),
  port: envNumber("DB_PORT", 3306),
  user: env("DB_USERNAME", "root"),
  password: env("DB_PASSWORD"),
  database: env("DB_DATABASE", "ortic"),
  connectionLimit: envNumber("DB_POOL_MAX", 10),
  logging: envBoolean("DB_LOGGING", false),
};

// Pool bersifat lazy: koneksi baru dibuat saat query pertama dijalankan.
const pool = mysql.createPool({
  host: databaseConfig.host,
  port: databaseConfig.port,
  user: databaseConfig.user,
  password: databaseConfig.password,
  database: databaseConfig.database,
  connectionLimit: databaseConfig.connectionLimit,
  charset: "utf8mb4_unicode_ci",
  timezone: "Z",
});

// Samakan timezone session MySQL dengan mysql2 (UTC) supaya kolom DATETIME/TIMESTAMP tidak bergeser.
pool.on("connection", (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

const db = drizzle(pool, { schema, mode: "default", logger: databaseConfig.logging });

const checkDatabaseConnection = async (): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
};

const closeDatabaseConnection = async (): Promise<void> => {
  await pool.end();
};

export { db, pool, databaseConfig, checkDatabaseConnection, closeDatabaseConnection };
