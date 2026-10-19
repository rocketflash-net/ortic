import { Request, Response } from "express";
import CheckoutService from "@services/checkout.service";
import OrderService from "@services/order.service";
import UserAddressService from "@services/user-address.service";
import { getAuthUser } from "@utils/request.util";
import { saveAddressSchema } from "@validators/address.validator";
import { checkoutQuoteSchema, orderCodeParamSchema, placeOrderSchema } from "@validators/checkout.validator";
import { idParamSchema, paginationQuerySchema } from "@validators/common.validator";

const addressService = new UserAddressService();
const checkoutService = new CheckoutService();
const orderService = new OrderService();

// GET /me/addresses
const addresses = async (req: Request, res: Response) => {
  const result = await addressService.list(getAuthUser(req).id);
  res.status(result.status).json(result.data);
};

// POST /me/addresses
const storeAddress = async (req: Request, res: Response) => {
  const result = await addressService.store(getAuthUser(req).id, saveAddressSchema.parse(req.body));
  res.status(result.status).json(result.data);
};

// PUT /me/addresses/:id
const updateAddress = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const result = await addressService.update(getAuthUser(req).id, id, saveAddressSchema.parse(req.body));
  res.status(result.status).json(result.data);
};

// DELETE /me/addresses/:id
const destroyAddress = async (req: Request, res: Response) => {
  const { id } = idParamSchema.parse(req.params);
  const result = await addressService.destroy(getAuthUser(req).id, id);
  res.status(result.status).json(result.data);
};

// POST /checkout/quote
const quote = async (req: Request, res: Response) => {
  const result = await checkoutService.quote(getAuthUser(req).id, checkoutQuoteSchema.parse(req.body));
  res.status(result.status).json(result.data);
};

// POST /checkout
const place = async (req: Request, res: Response) => {
  const result = await checkoutService.place(getAuthUser(req).id, placeOrderSchema.parse(req.body));
  res.status(result.status).json(result.data);
};

// GET /orders
const index = async (req: Request, res: Response) => {
  const result = await orderService.list(getAuthUser(req).id, paginationQuerySchema.parse(req.query));
  res.status(result.status).json(result.data);
};

// GET /orders/:code
const show = async (req: Request, res: Response) => {
  const { code } = orderCodeParamSchema.parse(req.params);
  const result = await orderService.show(getAuthUser(req).id, code);
  res.status(result.status).json(result.data);
};

// POST /orders/:code/cancel
const cancel = async (req: Request, res: Response) => {
  const { code } = orderCodeParamSchema.parse(req.params);
  const result = await orderService.cancel(getAuthUser(req).id, code);
  res.status(result.status).json(result.data);
};

// POST /orders/:code/simulate-payment (provider mock, non-production)
const simulatePayment = async (req: Request, res: Response) => {
  const { code } = orderCodeParamSchema.parse(req.params);
  const result = await orderService.simulatePayment(getAuthUser(req).id, code);
  res.status(result.status).json(result.data);
};

export { addresses, storeAddress, updateAddress, destroyAddress, quote, place, index, show, cancel, simulatePayment };
