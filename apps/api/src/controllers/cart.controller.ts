import { Request, Response } from "express";
import CartService from "@services/cart.service";
import { getAuthUser } from "@utils/request.util";
import { mergeCartSchema, setCartItemSchema } from "@validators/checkout.validator";

const service = new CartService();

// GET /cart
const show = async (req: Request, res: Response) => {
  const result = await service.show(getAuthUser(req).id);
  res.status(result.status).json(result.data);
};

// PUT /cart/items { variant_id, quantity } (0 = hapus)
const setItem = async (req: Request, res: Response) => {
  const result = await service.setItem(getAuthUser(req).id, setCartItemSchema.parse(req.body));
  res.status(result.status).json(result.data);
};

// POST /cart/merge { items } -> gabungkan keranjang tamu setelah login.
const merge = async (req: Request, res: Response) => {
  const result = await service.merge(getAuthUser(req).id, mergeCartSchema.parse(req.body));
  res.status(result.status).json(result.data);
};

// DELETE /cart
const clear = async (req: Request, res: Response) => {
  const result = await service.clear(getAuthUser(req).id);
  res.status(result.status).json(result.data);
};

export { show, setItem, merge, clear };
