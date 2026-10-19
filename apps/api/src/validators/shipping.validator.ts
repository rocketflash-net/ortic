import { z } from "zod";
import { positiveId } from "@validators/common.validator";

const areaSearchQuerySchema = z.object({
  q: z.string().trim().min(3).max(100),
});

// Estimasi ongkir dari satu gudang ke area tujuan untuk paket dengan berat & nilai tertentu.
const rateQuoteSchema = z.object({
  warehouse_id: positiveId(),
  destination_area_id: z.string().trim().min(1).max(64),
  weight_gram: z.number().int().min(1).max(500000),
  // Nilai barang (Rp); diisi bila paket diasuransikan.
  insured_value: z.number().int().min(0).max(1000000000).default(0),
});

type RateQuoteInputType = z.infer<typeof rateQuoteSchema>;

export { areaSearchQuerySchema, rateQuoteSchema, type RateQuoteInputType };
