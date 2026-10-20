import { Request, Response } from "express";
import AdminOrderService from "@services/admin-order.service";
import { getAuditActor, getAuthUser } from "@utils/request.util";
import { listAdminOrderQuerySchema, markRefundedSchema, rejectOrderSchema } from "@validators/admin-order.validator";
import { orderCodeParamSchema } from "@validators/checkout.validator";

const service = new AdminOrderService();

// GET /admin/orders?status=&warehouse_id=&date_from=&date_to=&search=
const index = async (req: Request, res: Response) => {
  const result = await service.list(listAdminOrderQuerySchema.parse(req.query), getAuthUser(req));
  res.status(result.status).json(result.data);
};

// GET /admin/orders/:code
const show = async (req: Request, res: Response) => {
  const { code } = orderCodeParamSchema.parse(req.params);
  const result = await service.show(code, getAuthUser(req));
  res.status(result.status).json(result.data);
};

// POST /admin/orders/:code/accept
const accept = async (req: Request, res: Response) => {
  const { code } = orderCodeParamSchema.parse(req.params);
  const result = await service.accept(code, getAuthUser(req), getAuditActor(req));
  res.status(result.status).json(result.data);
};

// POST /admin/orders/:code/reject { reason }
const reject = async (req: Request, res: Response) => {
  const { code } = orderCodeParamSchema.parse(req.params);
  const result = await service.reject(code, rejectOrderSchema.parse(req.body), getAuthUser(req), getAuditActor(req));
  res.status(result.status).json(result.data);
};

// POST /admin/orders/:code/refund { amount?, note? }
const markRefunded = async (req: Request, res: Response) => {
  const { code } = orderCodeParamSchema.parse(req.params);
  const result = await service.markRefunded(code, markRefundedSchema.parse(req.body ?? {}), getAuthUser(req), getAuditActor(req));
  res.status(result.status).json(result.data);
};

// POST /admin/orders/:code/book-shipment
const bookShipment = async (req: Request, res: Response) => {
  const { code } = orderCodeParamSchema.parse(req.params);
  const result = await service.bookShipment(code, getAuthUser(req), getAuditActor(req));
  res.status(result.status).json(result.data);
};

// POST /admin/orders/:code/simulate-shipping (BITESHIP_MOCK_ORDERS, non-production)
const simulateShipping = async (req: Request, res: Response) => {
  const { code } = orderCodeParamSchema.parse(req.params);
  const result = await service.simulateShipping(code, getAuthUser(req));
  res.status(result.status).json(result.data);
};

export { index, show, accept, reject, markRefunded, bookShipment, simulateShipping };
