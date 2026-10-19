import { Request, Response } from "express";
import ShippingService from "@services/shipping.service";
import { areaSearchQuerySchema, rateQuoteSchema } from "@validators/shipping.validator";

const service = new ShippingService();

// GET /shipping/areas?q=
const areas = async (req: Request, res: Response) => {
  const { q } = areaSearchQuerySchema.parse(req.query);
  const result = await service.searchAreas(q);
  res.status(result.status).json(result.data);
};

// POST /admin/shipping/rates
const rates = async (req: Request, res: Response) => {
  const result = await service.quote(rateQuoteSchema.parse(req.body));
  res.status(result.status).json(result.data);
};

export { areas, rates };
