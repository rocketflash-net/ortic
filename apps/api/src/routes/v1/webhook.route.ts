import { Router } from "express";
import { isProduction } from "@config/app.config";
import * as batpay from "@controllers/batpay.controller";
import { mockPayment } from "@controllers/webhook.controller";

// Server-to-server: diverifikasi lewat signature/token provider, bukan session. Satu prefix per provider.
const router = Router();

// BatPay hanya menerima URL callback yang diakhiri path SNAP standar (`/v1.0/access-token/b2b`, `/v1.0/qr/qr-mpm-notify`).
router.post("/batpay/v1.0/access-token/b2b", batpay.accessToken);
router.post("/batpay/v1.0/qr/qr-mpm-notify", batpay.qrisNotify);

if (!isProduction()) router.post("/mock/payments", mockPayment);

export default router;
