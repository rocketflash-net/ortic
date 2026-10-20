import { z } from "zod";
import { CATEGORY_COLORS } from "@enums/category-color.enum";

const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    color: z.enum(CATEGORY_COLORS).nullable(),
    sort_order: z.number().int().min(0).max(1000),
    is_active: z.boolean(),
    // Markup khusus kategori (%); null = ikut markup global. Hanya Owner.
    markup_percent: z.number().min(0).max(1000).nullable(),
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, "Provide at least one field to update");

const categoryMarkupPreviewSchema = z.object({ markup_percent: z.number().min(0).max(1000).nullable() });

type UpdateCategoryInputType = z.infer<typeof updateCategorySchema>;

export { updateCategorySchema, categoryMarkupPreviewSchema, type UpdateCategoryInputType };
