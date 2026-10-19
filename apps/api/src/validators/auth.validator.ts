import { z } from "zod";
import FrontendAppEnum, { FRONTEND_APPS } from "@enums/frontend-app.enum";

const googleStartQuerySchema = z.object({
  // Path tujuan setelah login. Disaring lagi oleh safeRedirectPath.
  redirect: z.string().max(500).optional(),
  // Aplikasi yang memulai login: menentukan ke frontend mana callback Google diarahkan.
  app: z.enum(FRONTEND_APPS).default(FrontendAppEnum.web),
});

const googleCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  // Diisi Google jika user membatalkan login.
  error: z.string().optional(),
});

const requestEmailCodeSchema = z.object({
  email: z.email().max(191),
});

const verifyEmailCodeSchema = z.object({
  email: z.email().max(191),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
  // Path dashboard tujuan setelah login (US-04). Disaring lagi oleh safeRedirectPath.
  redirect: z.string().max(500).optional(),
});

const exchangeCodeSchema = z.object({
  code: z.string().min(1).max(200),
});

const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1).max(300),
});

// Ubah profil sendiri: hanya nama. Field lain (mis. email) diabaikan, jadi email tidak bisa diubah lewat sini.
const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(150),
});

export {
  googleStartQuerySchema,
  googleCallbackQuerySchema,
  requestEmailCodeSchema,
  verifyEmailCodeSchema,
  exchangeCodeSchema,
  refreshTokenSchema,
  updateProfileSchema,
};
