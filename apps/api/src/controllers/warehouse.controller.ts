import { Request, Response } from "express";
import WarehouseService from "@services/warehouse.service";
import { getAuditActor } from "@utils/request.util";
import { idParamSchema } from "@validators/common.validator";
import { createWarehouseSchema, updateWarehouseSchema } from "@validators/warehouse.validator";

const service = new WarehouseService();

// GET /admin/warehouses
const index = async (_req: Request, res: Response) => {
  const result = await service.list();
  res.status(result.status).json(result.data);
};

// GET /admin/warehouses/:id
const show = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const result = await service.show(id);
  res.status(result.status).json(result.data);
};

// POST /admin/warehouses
const store = async (req: Request, res: Response) => {
  const result = await service.store(createWarehouseSchema.parse(req.body), getAuditActor(req));
  res.status(result.status).json(result.data);
};

// PATCH /admin/warehouses/:id
const update = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const result = await service.update(id, updateWarehouseSchema.parse(req.body), getAuditActor(req));
  res.status(result.status).json(result.data);
};

export { index, show, store, update };
