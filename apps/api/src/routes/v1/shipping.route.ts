import { Router } from "express";
import * as shipping from "@controllers/shipping.controller";
import { biteshipLimiter } from "@config/rate-limit.config";

// Pengiriman (wajib login). Pencarian area dipakai form gudang (admin) dan alamat pembeli (Fase 2).
const router = Router();

router.get("/areas", biteshipLimiter, shipping.areas);

export default router;
