import { db } from "@config/database.config";

type DatabaseType = typeof db;

type TransactionType = Parameters<Parameters<DatabaseType["transaction"]>[0]>[0];

// Koneksi utama atau transaction, sehingga repository yang sama bisa dipakai di dalam transaction.
type DatabaseExecutorType = DatabaseType | TransactionType;

export type { DatabaseType, TransactionType, DatabaseExecutorType };
