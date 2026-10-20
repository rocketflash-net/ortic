import { Router } from "express";
import { biteshipLimiter } from "@config/rate-limit.config";
import * as cart from "@controllers/cart.controller";
import * as order from "@controllers/order.controller";
import PermissionEnum from "@enums/permission.enum";
import { requirePermission as can } from "@middleware/auth.middleware";

// Belanja (wajib login): buku alamat, checkout QRIS, dan pesanan milik sendiri.
const router = Router();

router.get("/me/addresses", order.addresses);
router.post("/me/addresses", order.storeAddress);
router.put("/me/addresses/:id", order.updateAddress);
router.delete("/me/addresses/:id", order.destroyAddress);

// Keranjang server (tersinkron di semua perangkat).
router.get("/cart", can(PermissionEnum.orders_create), cart.show);
router.put("/cart/items", can(PermissionEnum.orders_create), cart.setItem);
router.post("/cart/merge", can(PermissionEnum.orders_create), cart.merge);
router.delete("/cart", can(PermissionEnum.orders_create), cart.clear);

// Quote & checkout memanggil API ongkir Biteship (ditagih per panggilan), jadi ikut dibatasi.
router.post("/checkout/quote", can(PermissionEnum.orders_create), biteshipLimiter, order.quote);
router.post("/checkout", can(PermissionEnum.orders_create), biteshipLimiter, order.place);

router.get("/orders", can(PermissionEnum.orders_read), order.index);
router.get("/orders/:code", can(PermissionEnum.orders_read), order.show);
router.post("/orders/:code/cancel", can(PermissionEnum.orders_create), order.cancel);
router.post("/orders/:code/simulate-payment", can(PermissionEnum.orders_create), order.simulatePayment);

export default router;
