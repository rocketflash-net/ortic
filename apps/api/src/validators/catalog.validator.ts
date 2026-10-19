import { z } from "zod";
import { searchQuerySchema } from "@validators/common.validator";

const catalogProductQuerySchema = searchQuerySchema.extend({
  // Slug kategori, mis. "endodontik".
  category: z.string().trim().toLowerCase().max(120).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name"]).default("newest"),
});

const productSlugParamSchema = z.object({ slug: z.string().trim().toLowerCase().min(1).max(220) });

type CatalogProductQueryType = z.infer<typeof catalogProductQuerySchema>;

export { catalogProductQuerySchema, productSlugParamSchema, type CatalogProductQueryType };
