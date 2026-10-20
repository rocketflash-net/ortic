import { z } from "zod";
import StockMovementTypeEnum from "@enums/stock-movement-type.enum";
import { positiveId, searchQuerySchema, paginationQuerySchema } from "@validators/common.validator";

const quantity = () => z.number().int().min(0).max(1000000);
const note = () =>
  z
    .string()
    .trim()
    .max(255)
    .nullable()
    .default(null)
    .transform((value) => value || null);

const listStockQuerySchema = searchQuerySchema.extend({
  // Kosong = gudang Staf, atau gudang aktif pertama.
  warehouse_id: positiveId().optional(),
  category_id: positiveId().optional(),
  level: z.enum(["all", "low", "out"]).default("all"),
});

const stockMovementQuerySchema = paginationQuerySchema.extend({
  variant_id: positiveId(),
  warehouse_id: positiveId().optional(),
});

// stock_in: quantity = jumlah barang masuk (+). adjustment: quantity = hasil hitung fisik (stok opname).
const adjustStockSchema = z
  .object({
    warehouse_id: positiveId(),
    variant_id: positiveId(),
    type: z.enum([StockMovementTypeEnum.stock_in, StockMovementTypeEnum.adjustment]),
    quantity: quantity(),
    note: note(),
  })
  .refine((input) => input.type !== StockMovementTypeEnum.stock_in || input.quantity > 0, {
    path: ["quantity"],
    message: "Incoming quantity must be at least 1",
  });

const transferStockSchema = z.object({
  from_warehouse_id: positiveId(),
  to_warehouse_id: positiveId(),
  variant_id: positiveId(),
  quantity: quantity().min(1),
  note: note(),
});

const updateThresholdSchema = z.object({
  warehouse_id: positiveId(),
  variant_id: positiveId(),
  low_stock_threshold: z.number().int().min(0).max(100000),
});

type ListStockQueryType = z.infer<typeof listStockQuerySchema>;
type StockMovementQueryType = z.infer<typeof stockMovementQuerySchema>;
type AdjustStockInputType = z.infer<typeof adjustStockSchema>;
type TransferStockInputType = z.infer<typeof transferStockSchema>;
type UpdateThresholdInputType = z.infer<typeof updateThresholdSchema>;

export {
  listStockQuerySchema,
  stockMovementQuerySchema,
  adjustStockSchema,
  transferStockSchema,
  updateThresholdSchema,
  type ListStockQueryType,
  type StockMovementQueryType,
  type AdjustStockInputType,
  type TransferStockInputType,
  type UpdateThresholdInputType,
};
