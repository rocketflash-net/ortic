import { Router } from "express";
import { authenticate } from "@middleware/auth.middleware";
import adminRoute from "@routes/v1/admin.route";
import authRoute from "@routes/v1/auth.route";
import catalogRoute from "@routes/v1/catalog.route";
import orderRoute from "@routes/v1/order.route";
import shippingRoute from "@routes/v1/shipping.route";
import webhookRoute from "@routes/v1/webhook.route";

// Semua route API versi 1 didaftarkan di sini -> prefix /api/v1
const router = Router();

// Tanpa session.
router.use("/auth", authRoute);
router.use("/catalog", catalogRoute);
// Server-to-server dari payment gateway (signature/token provider, bukan session).
router.use("/webhooks", webhookRoute);

// Wajib login (Authorization: Bearer <access token>).
// Hak akses per endpoint memakai requirePermission di masing-masing route (RBAC).
const privateRouter = Router();
privateRouter.use(authenticate);
privateRouter.use("/admin", adminRoute);
privateRouter.use("/shipping", shippingRoute);
privateRouter.use(orderRoute);

router.use(privateRouter);

export default router;
