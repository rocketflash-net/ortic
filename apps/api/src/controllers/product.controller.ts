import { Request, Response } from "express";
import ProductIoService from "@services/product-io.service";
import ProductService from "@services/product.service";
import { getAuditActor, getAuthUser } from "@utils/request.util";
import { idParamSchema } from "@validators/common.validator";
import {
  createBrandSchema,
  importProductsSchema,
  listProductQuerySchema,
  presignProductImageSchema,
  productStatusSchema,
  saveProductSchema,
} from "@validators/product.validator";

const service = new ProductService();
const ioService = new ProductIoService();

// GET /admin/products
const index = async (req: Request, res: Response) => {
  const { page, limit, search, category_id, status } = listProductQuerySchema.parse(req.query);
  const result = await service.list({ search, category_id, status }, { page, limit });
  res.status(result.status).json(result.data);
};

// GET /admin/products/:id
const show = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const result = await service.show(id, getAuthUser(req));
  res.status(result.status).json(result.data);
};

// POST /admin/products
const store = async (req: Request, res: Response) => {
  const result = await service.store(saveProductSchema.parse(req.body), getAuthUser(req), getAuditActor(req));
  res.status(result.status).json(result.data);
};

// PUT /admin/products/:id
const update = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const result = await service.update(id, saveProductSchema.parse(req.body), getAuthUser(req), getAuditActor(req));
  res.status(result.status).json(result.data);
};

// PATCH /admin/products/:id/status
const updateStatus = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const { status } = productStatusSchema.parse(req.body);
  const result = await service.updateStatus(id, status, getAuthUser(req), getAuditActor(req));
  res.status(result.status).json(result.data);
};

// POST /admin/products/images/presign
const presignImage = async (req: Request, res: Response) => {
  const result = await service.presignImage(presignProductImageSchema.parse(req.body));
  res.status(result.status).json(result.data);
};

// GET /admin/products/pricing-defaults
const pricingDefaults = async (_req: Request, res: Response) => {
  const result = await service.pricingDefaults();
  res.status(result.status).json(result.data);
};

// GET /admin/brands
const brands = async (_req: Request, res: Response) => {
  const result = await service.brands();
  res.status(result.status).json(result.data);
};

// POST /admin/brands
const storeBrand = async (req: Request, res: Response) => {
  const { name } = createBrandSchema.parse(req.body);
  const result = await service.storeBrand(name, getAuditActor(req));
  res.status(result.status).json(result.data);
};

// POST /admin/products/:id/duplicate
const duplicate = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const result = await ioService.duplicate(id, getAuditActor(req));
  res.status(result.status).json(result.data);
};

// GET /admin/products/export.csv
const exportCsv = async (req: Request, res: Response) => {
  const csv = await ioService.exportCsv(getAuthUser(req));
  res.status(200).set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="produk-ortic.csv"' }).send(csv);
};

// POST /admin/products/import { csv, dry_run }
const importCsv = async (req: Request, res: Response) => {
  const result = await ioService.importCsv(importProductsSchema.parse(req.body), getAuthUser(req), getAuditActor(req));
  res.status(result.status).json(result.data);
};

export { index, show, store, update, updateStatus, presignImage, pricingDefaults, brands, storeBrand, duplicate, exportCsv, importCsv };
