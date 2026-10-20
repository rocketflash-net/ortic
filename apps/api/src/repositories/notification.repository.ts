import { and, count, desc, eq, gt, isNull, or, SQL } from "drizzle-orm";
import Repository from "@base/repository.base";
import { notifications } from "@models/notification.model";
import { users } from "@models/user.model";
import { NewNotificationType, NotificationType } from "@@types/entity.type";
import { PaginationOptionsType } from "@@types/pagination.type";

export default class NotificationRepository extends Repository {
  async store(data: NewNotificationType): Promise<NotificationType> {
    const [result] = await this.executor.insert(notifications).values(data).$returningId();
    const [row] = await this.executor.select().from(notifications).where(eq(notifications.id, result!.id)).limit(1);
    return row!;
  }

  // Staf yang dikaitkan ke satu gudang hanya melihat notifikasi gudang itu (dan yang tidak terkait gudang).
  async findVisible(warehouseId: number | null, { limit, offset }: PaginationOptionsType): Promise<NotificationType[]> {
    return await this.executor
      .select()
      .from(notifications)
      .where(this.visibleWhere(warehouseId))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit)
      .offset(offset);
  }

  async countVisible(warehouseId: number | null, after?: Date | null): Promise<number> {
    const [row] = await this.executor
      .select({ total: count() })
      .from(notifications)
      .where(and(this.visibleWhere(warehouseId), after ? gt(notifications.createdAt, after) : undefined));
    return row?.total ?? 0;
  }

  async readAt(userId: number): Promise<Date | null> {
    const [row] = await this.executor.select({ readAt: users.notificationsReadAt }).from(users).where(eq(users.id, userId)).limit(1);
    return row?.readAt ?? null;
  }

  async markRead(userId: number, at: Date): Promise<void> {
    await this.executor.update(users).set({ notificationsReadAt: at }).where(eq(users.id, userId));
  }

  private visibleWhere(warehouseId: number | null): SQL | undefined {
    return warehouseId ? or(isNull(notifications.warehouseId), eq(notifications.warehouseId, warehouseId)) : undefined;
  }
}
