import { Request, Response } from "express";
import { z } from "zod";
import { updateSettingsSchema } from "@registries/setting.registry";
import AdminCatalogService from "@services/admin-catalog.service";
import SettingService from "@services/setting.service";
import { getAuditActor, getAuthUser } from "@utils/request.util";
import { categoryMarkupPreviewSchema, updateCategorySchema } from "@validators/category.validator";
import { idParamSchema } from "@validators/common.validator";
import { updateCourierSchema } from "@validators/courier.validator";

const settingService = new SettingService();
const catalogService = new AdminCatalogService();

const pricingPreviewSchema = z.object({
  markup_percent: z.number().min(0).max(1000).optional(),
  price_rounding: z.number().int().min(1).max(100000).optional(),
});

// GET /admin/settings
const show = async (_req: Request, res: Response) => {
  const result = await settingService.show();
  res.status(result.status).json(result.data);
};

// PUT /admin/settings (sebagian key saja boleh)
const update = async (req: Request, res: Response) => {
  const result = await settingService.update(updateSettingsSchema.parse(req.body), getAuditActor(req));
  res.status(result.status).json(result.data);
};

// POST /admin/settings/pricing-preview { markup_percent?, price_rounding? }
const pricingPreview = async (req: Request, res: Response) => {
  const result = await settingService.previewPricing(pricingPreviewSchema.parse(req.body));
  res.status(result.status).json(result.data);
};

// GET /admin/categories
const categories = async (req: Request, res: Response) => {
  const result = await catalogService.categories(getAuthUser(req));
  res.status(result.status).json(result.data);
};

// PATCH /admin/categories/:id
const updateCategory = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const result = await catalogService.updateCategory(id, updateCategorySchema.parse(req.body), getAuthUser(req), getAuditActor(req));
  res.status(result.status).json(result.data);
};

// POST /admin/categories/:id/markup-preview { markup_percent }
const categoryMarkupPreview = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const { markup_percent } = categoryMarkupPreviewSchema.parse(req.body);
  const result = await catalogService.previewCategoryMarkup(id, markup_percent);
  res.status(result.status).json(result.data);
};

// GET /admin/couriers
const couriers = async (_req: Request, res: Response) => {
  const result = await catalogService.couriers();
  res.status(result.status).json(result.data);
};

// PATCH /admin/couriers/:id
const updateCourier = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const result = await catalogService.updateCourier(id, updateCourierSchema.parse(req.body), getAuditActor(req));
  res.status(result.status).json(result.data);
};

export { show, update, pricingPreview, categories, updateCategory, categoryMarkupPreview, couriers, updateCourier };
