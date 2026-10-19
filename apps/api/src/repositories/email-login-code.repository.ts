import { and, count, desc, eq, gt, gte, isNull, lt, lte, or, sql } from "drizzle-orm";
import Repository from "@base/repository.base";
import { emailLoginCodes } from "@models/email-login-code.model";
import { EmailLoginCodeType, NewEmailLoginCodeType } from "@@types/entity.type";

export default class EmailLoginCodeRepository extends Repository {
  async store(payload: NewEmailLoginCodeType): Promise<void> {
    await this.executor.insert(emailLoginCodes).values(payload);
  }

  async findLatest(email: string): Promise<EmailLoginCodeType | null> {
    const [code] = await this.executor.select().from(emailLoginCodes).where(eq(emailLoginCodes.email, email)).orderBy(desc(emailLoginCodes.id)).limit(1);
    return code ?? null;
  }

  async countSince(email: string, since: Date): Promise<number> {
    const [result] = await this.executor
      .select({ total: count() })
      .from(emailLoginCodes)
      .where(and(eq(emailLoginCodes.email, email), gte(emailLoginCodes.createdAt, since)));
    return result?.total ?? 0;
  }

  // Kode yang masih bisa dipakai: belum dipakai, belum kedaluwarsa, dan percobaan salah belum mencapai batas.
  async findUsable(email: string, now: Date, maxAttempts: number): Promise<EmailLoginCodeType | null> {
    const [code] = await this.executor
      .select()
      .from(emailLoginCodes)
      .where(
        and(
          eq(emailLoginCodes.email, email),
          isNull(emailLoginCodes.consumedAt),
          gt(emailLoginCodes.expiresAt, now),
          lt(emailLoginCodes.attempts, maxAttempts)
        )
      )
      .orderBy(desc(emailLoginCodes.id))
      .limit(1);
    return code ?? null;
  }

  async incrementAttempts(id: number): Promise<void> {
    await this.executor
      .update(emailLoginCodes)
      .set({ attempts: sql`${emailLoginCodes.attempts} + 1` })
      .where(eq(emailLoginCodes.id, id));
  }

  // Tandai satu kode terpakai. Kondisi `consumed_at IS NULL` mencegah kode yang sama dipakai dua request bersamaan.
  async consume(id: number, now: Date): Promise<boolean> {
    const [result] = await this.executor
      .update(emailLoginCodes)
      .set({ consumedAt: now })
      .where(and(eq(emailLoginCodes.id, id), isNull(emailLoginCodes.consumedAt)));
    return result.affectedRows === 1;
  }

  // Kode lama tidak berlaku lagi begitu kode baru diminta.
  async consumeAllActive(email: string, now: Date): Promise<void> {
    await this.executor
      .update(emailLoginCodes)
      .set({ consumedAt: now })
      .where(and(eq(emailLoginCodes.email, email), isNull(emailLoginCodes.consumedAt)));
  }

  // Hapus kode yang sudah tidak berguna (kedaluwarsa / terpakai) lebih lama dari `before`.
  async destroyStale(before: Date): Promise<number> {
    const [result] = await this.executor
      .delete(emailLoginCodes)
      .where(or(lte(emailLoginCodes.expiresAt, before), lte(emailLoginCodes.consumedAt, before)));
    return result.affectedRows;
  }
}
