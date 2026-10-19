import { and, count, desc, eq, SQL } from "drizzle-orm";
import Repository from "@base/repository.base";
import { auditLogs } from "@models/audit-log.model";
import { users } from "@models/user.model";
import { AuditLogFilterType, AuditLogWithActorType } from "@@types/audit.type";
import { NewAuditLogType } from "@@types/entity.type";
import { PaginationOptionsType } from "@@types/pagination.type";

export default class AuditLogRepository extends Repository {
  async store(payload: NewAuditLogType): Promise<void> {
    await this.executor.insert(auditLogs).values(payload);
  }

  async findAll(filter: AuditLogFilterType, pagination: PaginationOptionsType): Promise<AuditLogWithActorType[]> {
    return await this.executor
      .select({ log: auditLogs, actorEmail: users.email, actorName: users.name })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorUserId))
      .where(this.filterCondition(filter))
      .orderBy(desc(auditLogs.id))
      .limit(pagination.limit)
      .offset(pagination.offset);
  }

  async count(filter: AuditLogFilterType): Promise<number> {
    const [result] = await this.executor.select({ total: count() }).from(auditLogs).where(this.filterCondition(filter));
    return result?.total ?? 0;
  }

  private filterCondition(filter: AuditLogFilterType): SQL | undefined {
    const conditions: SQL[] = [];
    if (filter.action) conditions.push(eq(auditLogs.action, filter.action));
    if (filter.actor_user_id) conditions.push(eq(auditLogs.actorUserId, filter.actor_user_id));
    if (filter.target_type) conditions.push(eq(auditLogs.targetType, filter.target_type));
    if (filter.target_id) conditions.push(eq(auditLogs.targetId, filter.target_id));
    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
