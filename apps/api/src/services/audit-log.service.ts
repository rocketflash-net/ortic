import Service from "@base/service.base";
import AuditLogDto from "@dto/audit-log.dto";
import { AuditActionType } from "@enums/audit.enum";
import AuditLogRepository from "@repositories/audit-log.repository";
import { AuditActorType, AuditLogFilterType } from "@@types/audit.type";
import { DatabaseExecutorType } from "@@types/database.type";
import { PaginationQueryType } from "@@types/pagination.type";
import ResponseType from "@@types/response.type";
import { buildPaginationMeta, toPaginationOptions } from "@utils/pagination.util";

type AuditEntryType = {
  action: AuditActionType;
  targetType: string;
  targetId: number | string | null;
  metadata?: Record<string, unknown>;
};

export default class AuditLogService extends Service {
  constructor(private readonly auditLogRepository: AuditLogRepository = new AuditLogRepository()) {
    super();
  }

  async list(filter: AuditLogFilterType, pagination: PaginationQueryType): Promise<ResponseType> {
    const [rows, total] = await Promise.all([this.auditLogRepository.findAll(filter, toPaginationOptions(pagination)), this.auditLogRepository.count(filter)]);
    return this.success(AuditLogDto.collection(rows), "Success", undefined, { pagination: buildPaginationMeta(pagination, total) });
  }

  // Panggil di dalam transaction yang sama dengan perubahan datanya, supaya perubahan & catatannya tidak bisa terpisah.
  async record(executor: DatabaseExecutorType, actor: AuditActorType, entry: AuditEntryType): Promise<void> {
    await this.auditLogRepository.withTransaction(executor).store({
      actorUserId: actor.userId,
      source: actor.source,
      ipAddress: actor.ipAddress,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId === null ? null : String(entry.targetId),
      metadata: entry.metadata,
    });
  }

  // Hanya field yang berubah: { before: {...}, after: {...} }.
  static changes<T extends Record<string, unknown>>(before: T, after: T): { before: Partial<T>; after: Partial<T> } {
    const changedKeys = (Object.keys(after) as (keyof T)[]).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    const pick = (source: T) => Object.fromEntries(changedKeys.map((key) => [key, source[key]])) as Partial<T>;
    return { before: pick(before), after: pick(after) };
  }
}
