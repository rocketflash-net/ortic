import { z } from "zod";
import { positiveId } from "@validators/common.validator";
import { wibDay } from "@utils/date.util";

const MAX_RANGE_DAYS = 366;
const dateOnly = () => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");

// Periode laporan (hari WIB, inklusif). Default 30 hari terakhir.
const reportQuerySchema = z
  .object({
    date_from: dateOnly().default(() => wibDay(new Date(Date.now() - 29 * 24 * 3600 * 1000))),
    date_to: dateOnly().default(() => wibDay(new Date())),
    warehouse_id: positiveId().optional(),
  })
  .refine((query) => query.date_from <= query.date_to, { path: ["date_from"], message: "date_from must be before date_to" })
  .refine((query) => (Date.parse(query.date_to) - Date.parse(query.date_from)) / 86400000 < MAX_RANGE_DAYS, {
    path: ["date_to"],
    message: `Range is limited to ${MAX_RANGE_DAYS} days`,
  });

type ReportQueryType = z.infer<typeof reportQuerySchema>;

export { reportQuerySchema, type ReportQueryType };
