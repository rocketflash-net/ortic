import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import Repository from "@base/repository.base";
import { authExchangeCodes } from "@models/auth-exchange-code.model";
import { NewAuthExchangeCodeType } from "@@types/entity.type";

export default class AuthExchangeCodeRepository extends Repository {
  async store(payload: NewAuthExchangeCodeType): Promise<void> {
    await this.executor.insert(authExchangeCodes).values(payload);
  }

  /**
   * Pakai kode sekali: berhasil hanya jika belum dipakai & belum kedaluwarsa. Kondisi di UPDATE membuat dua request
   * bersamaan dengan kode yang sama tidak bisa sama-sama berhasil. Mengembalikan id user pemilik kode, atau null.
   */
  async consume(codeHash: string, now: Date): Promise<number | null> {
    const [result] = await this.executor
      .update(authExchangeCodes)
      .set({ consumedAt: now })
      .where(and(eq(authExchangeCodes.codeHash, codeHash), isNull(authExchangeCodes.consumedAt), gt(authExchangeCodes.expiresAt, now)));
    if (result.affectedRows !== 1) return null;

    const [code] = await this.executor.select({ userId: authExchangeCodes.userId }).from(authExchangeCodes).where(eq(authExchangeCodes.codeHash, codeHash)).limit(1);
    return code?.userId ?? null;
  }

  // Hapus kode yang sudah tidak berguna (kedaluwarsa / terpakai) lebih lama dari `before`.
  async destroyStale(before: Date): Promise<number> {
    const [result] = await this.executor.delete(authExchangeCodes).where(or(lte(authExchangeCodes.expiresAt, before), lte(authExchangeCodes.consumedAt, before)));
    return result.affectedRows;
  }
}
