import { Request, Response } from "express";
import CatalogService from "@services/catalog.service";
import { catalogProductQuerySchema, productSlugParamSchema } from "@validators/catalog.validator";

const service = new CatalogService();

// GET /catalog/categories -> kategori aktif, urut sesuai sort_order.
const categories = async (_req: Request, res: Response) => {
  const result = await service.categories();
  res.status(result.status).json(result.data);
};

// GET /catalog/products?search&category&sort&page&limit
const products = async (req: Request, res: Response) => {
  const result = await service.products(catalogProductQuerySchema.parse(req.query));
  res.status(result.status).json(result.data);
};

// GET /catalog/products/:slug
const product = async (req: Request, res: Response) => {
  const { slug } = productSlugParamSchema.parse(req.params);
  const result = await service.product(slug);
  res.status(result.status).json(result.data);
};

// GET /catalog/store -> kontak & biaya toko (footer, bantuan, kebijakan).
const storeInfo = async (_req: Request, res: Response) => {
  const result = await service.storeInfo();
  res.status(result.status).json(result.data);
};

export { categories, products, product, storeInfo };
