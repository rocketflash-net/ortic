import { and, desc, eq, gt, inArray, lte, or } from "drizzle-orm";
import Repository from "@base/repository.base";
import { sessions } from "@models/session.model";
import { users } from "@models/user.model";
import { AuthUserType } from "@@types/auth.type";
import { NewSessionType, SessionType } from "@@types/entity.type";

export default class SessionRepository extends Repository {
  async store(payload: NewSessionType): Promise<void> {
    await this.executor.insert(sessions).values(payload);
  }

  // User pemilik session yang masih berlaku, atau null jika session tidak ada / kedaluwarsa.
  async findActiveUser(sessionId: string, now: Date): Promise<AuthUserType | null> {
    const [row] = await this.executor
      .select({ id: users.id, email: users.email, name: users.name, avatarUrl: users.avatarUrl, role: users.role, warehouseId: users.warehouseId })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
      .limit(1);
    return row ?? null;
  }

  async findById(sessionId: string): Promise<SessionType | null> {
    const [session] = await this.executor.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    return session ?? null;
  }

  /**
   * Rotasi: token yang berlaku (`currentHash`) menjadi token sebelumnya, `nextHash` menjadi token yang berlaku.
   * Hanya berhasil jika yang tersimpan masih `currentHash`, jadi dua refresh bersamaan tidak bisa sama-sama merotasi.
   */
  async rotateRefreshToken(sessionId: string, currentHash: string, nextHash: string, now: Date): Promise<boolean> {
    const [result] = await this.executor
      .update(sessions)
      .set({ refreshTokenHash: nextHash, previousRefreshTokenHash: currentHash, rotatedAt: now, lastUsedAt: now })
      .where(and(eq(sessions.id, sessionId), eq(sessions.refreshTokenHash, currentHash)));
    return result.affectedRows === 1;
  }

  /** Sisakan `keep` sesi user yang paling baru dipakai; sisanya (perangkat paling lama tidak dipakai) dicabut. */
  async keepMostRecent(userId: number, keep: number): Promise<number> {
    const stale = await this.executor
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.lastUsedAt), desc(sessions.createdAt))
      .limit(1000)
      .offset(keep);
    if (stale.length === 0) return 0;

    const [result] = await this.executor.delete(sessions).where(
      inArray(
        sessions.id,
        stale.map((session) => session.id)
      )
    );
    return result.affectedRows;
  }

  async destroy(sessionId: string): Promise<void> {
    await this.executor.delete(sessions).where(eq(sessions.id, sessionId));
  }

  // Logout dari semua perangkat, mis. setelah role user diubah.
  async destroyByUser(userId: number): Promise<number> {
    const [result] = await this.executor.delete(sessions).where(eq(sessions.userId, userId));
    return result.affectedRows;
  }

  // Sesi kedaluwarsa (absolut) atau menganggur sejak sebelum `idleBefore`.
  async destroyExpired(now: Date, idleBefore: Date): Promise<number> {
    const [result] = await this.executor.delete(sessions).where(or(lte(sessions.expiresAt, now), lte(sessions.lastUsedAt, idleBefore)));
    return result.affectedRows;
  }
}
