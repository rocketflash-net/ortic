import { z } from "zod";
import { ORDER_STATUSES } from "@enums/order-status.enum";
import { REFUND_STATUSES } from "@enums/refund-status.enum";
import { positiveId, searchQuerySchema } from "@validators/common.validator";

const dateOnly = () => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

// Daftar pesanan admin. `status` boleh beberapa, dipisah koma (mis. "processing,awaiting_pickup").
const listAdminOrderQuerySchema = searchQuerySchema.extend({
  status: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined
    )
    .pipe(z.array(z.enum(ORDER_STATUSES)).optional()),
  warehouse_id: positiveId().optional(),
  refund_status: z.enum(REFUND_STATUSES).optional(),
  // Tanggal pesanan dibuat, hari WIB (inklusif).
  date_from: dateOnly().optional(),
  date_to: dateOnly().optional(),
});

const rejectOrderSchema = z.object({
  reason: z.string().trim().min(3).max(255),
});

const markRefundedSchema = z.object({
  // Kosong = total pesanan.
  amount: z.number().int().min(0).max(1000000000).optional(),
  note: z.string().trim().max(255).nullable().default(null),
});

type ListAdminOrderQueryType = z.infer<typeof listAdminOrderQuerySchema>;
type RejectOrderInputType = z.infer<typeof rejectOrderSchema>;
type MarkRefundedInputType = z.infer<typeof markRefundedSchema>;

export {
  listAdminOrderQuerySchema,
  rejectOrderSchema,
  markRefundedSchema,
  type ListAdminOrderQueryType,
  type RejectOrderInputType,
  type MarkRefundedInputType,
};
