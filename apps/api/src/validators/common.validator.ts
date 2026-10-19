import { z } from "zod";
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from "@utils/pagination.util";

const positiveId = () => z.coerce.number().int().positive();

const idParamSchema = z.object({ id: positiveId() });

// Event diakses lewat UUID publiknya, bukan id internal.
const eventUuid = () => z.uuid();
const eventIdParamSchema = z.object({ id: eventUuid() });

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

const searchQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
});

// Query string boolean: "true" / "false".
const booleanQuery = () => z.enum(["true", "false"]).transform((value) => value === "true");

export { positiveId, idParamSchema, eventUuid, eventIdParamSchema, paginationQuerySchema, searchQuerySchema, booleanQuery };
