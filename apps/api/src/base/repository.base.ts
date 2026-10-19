import { db } from "@config/database.config";
import { DatabaseExecutorType, TransactionType } from "@@types/database.type";

/**
 * Base class untuk semua repository.
 * `executor` bisa berupa koneksi utama (`db`) atau transaction (`tx`),
 * sehingga repository yang sama bisa dipakai di dalam/luar transaction.
 */
export default abstract class Repository {
  protected readonly executor: DatabaseExecutorType;

  constructor(executor: DatabaseExecutorType = db) {
    this.executor = executor;
  }

  async transaction<T>(callback: (tx: TransactionType) => Promise<T>): Promise<T> {
    return await db.transaction(callback);
  }

  // Instance baru dari repository yang sama, tetapi query-nya berjalan di dalam transaction `tx`.
  withTransaction(executor: DatabaseExecutorType): this {
    const RepositoryClass = this.constructor as new (executor: DatabaseExecutorType) => this;
    return new RepositoryClass(executor);
  }
}
