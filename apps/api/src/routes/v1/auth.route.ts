import { Router } from "express";
import { authEmailLimiter } from "@config/rate-limit.config";
import {
  exchangeGoogleCode,
  googleCallback,
  googleStart,
  logout,
  me,
  refresh,
  requestEmailCode,
  updateMe,
  verifyEmailCode,
} from "@controllers/auth.controller";
import { authenticate } from "@middleware/auth.middleware";

const router = Router();

// Login Google: start/callback dibuka browser (redirect); dashboard lalu menukar kode dari callback menjadi token.
router.get("/google/start", googleStart);
router.get("/google/callback", googleCallback);
router.post("/google/exchange", authEmailLimiter, exchangeGoogleCode);

// Login OTP email (dibatasi per IP: menahan spam email & tebak kode).
router.post("/email/request", authEmailLimiter, requestEmailCode);
router.post("/email/verify", authEmailLimiter, verifyEmailCode);

// Token: refresh tanpa access token (dipakai justru saat access token kedaluwarsa).
router.post("/refresh", refresh);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);
router.patch("/me", authenticate, updateMe);

export default router;
