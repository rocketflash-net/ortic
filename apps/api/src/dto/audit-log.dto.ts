import { AuditLogWithActorType } from "@@types/audit.type";

type AuditLogResponseType = {
  id: number;
  action: string;
  source: string;
  // null untuk aksi dari CLI.
  actor: { id: number | null; name: string | null; email: string | null } | null;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: Date;
};

export default class AuditLogDto {
  static fromEntity({ log, actorEmail, actorName }: AuditLogWithActorType): AuditLogResponseType {
    return {
      id: log.id,
      action: log.action,
      source: log.source,
      actor: log.actorUserId ? { id: log.actorUserId, name: actorName, email: actorEmail } : null,
      target_type: log.targetType,
      target_id: log.targetId,
      metadata: log.metadata ?? null,
      ip_address: log.ipAddress,
      created_at: log.createdAt,
    };
  }

  static collection(rows: AuditLogWithActorType[]): AuditLogResponseType[] {
    return rows.map(AuditLogDto.fromEntity);
  }
}
