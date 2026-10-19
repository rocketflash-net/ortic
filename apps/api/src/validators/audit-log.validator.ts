import { z } from "zod";
import { AUDIT_ACTIONS } from "@enums/audit.enum";
import { paginationQuerySchema, positiveId } from "@validators/common.validator";

const listAuditLogQuerySchema = paginationQuerySchema.extend({
  action: z.enum(AUDIT_ACTIONS).optional(),
  actor_user_id: positiveId().optional(),
  // Contoh: target_type=user&target_id=12 untuk riwayat perubahan satu user.
  target_type: z.string().trim().max(32).optional(),
  target_id: z.string().trim().max(64).optional(),
});

type AuditLogFilterType = Omit<z.infer<typeof listAuditLogQuerySchema>, "page" | "limit">;

export { listAuditLogQuerySchema, type AuditLogFilterType };
