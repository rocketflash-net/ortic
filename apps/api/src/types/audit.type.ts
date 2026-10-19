import { AuditSourceType } from "@enums/audit.enum";
import { AuditLogType } from "@@types/entity.type";
import { AuditLogFilterType } from "@validators/audit-log.validator";

// Siapa yang melakukan aksi admin; dicatat ke audit_logs.
type AuditActorType = {
  // NULL untuk CLI.
  userId: number | null;
  source: AuditSourceType;
  ipAddress: string | null;
};

type AuditLogWithActorType = {
  log: AuditLogType;
  actorEmail: string | null;
  actorName: string | null;
};

export type { AuditActorType, AuditLogWithActorType, AuditLogFilterType };
