import { z } from "zod";

const updateCourierSchema = z
  .object({
    is_active: z.boolean(),
    // Kode layanan Biteship (courier_type) yang ditawarkan; null = semua layanan dari Rates API.
    services: z.array(z.string().trim().toLowerCase().min(1).max(32)).min(1).max(20).nullable(),
    sort_order: z.number().int().min(0).max(1000),
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, "Provide at least one field to update");

type UpdateCourierInputType = z.infer<typeof updateCourierSchema>;

export { updateCourierSchema, type UpdateCourierInputType };
