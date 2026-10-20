import { Request, Response } from "express";
import StockService from "@services/stock.service";
import { getAuditActor, getAuthUser } from "@utils/request.util";
import { adjustStockSchema, listStockQuerySchema, stockMovementQuerySchema, transferStockSchema, updateThresholdSchema } from "@validators/stock.validator";

const service = new StockService();

// GET /admin/stocks?warehouse_id=&search=&category_id=&level=all|low|out
const index = async (req: Request, res: Response) => {
  const result = await service.levels(listStockQuerySchema.parse(req.query), getAuthUser(req));
  res.status(result.status).json(result.data);
};

// GET /admin/stocks/movements?variant_id=&warehouse_id= (kartu stok)
const movements = async (req: Request, res: Response) => {
  const result = await service.movements(stockMovementQuerySchema.parse(req.query), getAuthUser(req));
  res.status(result.status).json(result.data);
};

// POST /admin/stocks/adjust { warehouse_id, variant_id, type: stock_in|adjustment, quantity, note }
const adjust = async (req: Request, res: Response) => {
  const result = await service.adjust(adjustStockSchema.parse(req.body), getAuthUser(req), getAuditActor(req));
  res.status(result.status).json(result.data);
};

// POST /admin/stocks/transfer { from_warehouse_id, to_warehouse_id, variant_id, quantity, note }
const transfer = async (req: Request, res: Response) => {
  const result = await service.transfer(transferStockSchema.parse(req.body), getAuthUser(req), getAuditActor(req));
  res.status(result.status).json(result.data);
};

// PATCH /admin/stocks/threshold { warehouse_id, variant_id, low_stock_threshold }
const updateThreshold = async (req: Request, res: Response) => {
  const result = await service.updateThreshold(updateThresholdSchema.parse(req.body), getAuthUser(req), getAuditActor(req));
  res.status(result.status).json(result.data);
};

export { index, movements, adjust, transfer, updateThreshold };
