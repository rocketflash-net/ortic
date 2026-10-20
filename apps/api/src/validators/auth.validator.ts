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

// Ubah profil sendiri: nama, nomor WhatsApp, profesi. Field lain (mis. email, role) diabaikan.
const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    phone: z
      .string()
      .trim()
      .transform((value) => value.replace(/[\s-]/g, ""))
      .pipe(z.string().regex(/^(\+?\d{8,15})?$/, "Phone must be 8-15 digits"))
      .transform((value) => value || null)
      .nullable(),
    // Dokter gigi, mahasiswa FKG, klinik, dll.
    profession: z
      .string()
      .trim()
      .max(50)
      .transform((value) => value || null)
      .nullable(),
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, "Provide at least one field to update");

type UpdateProfileInputType = z.infer<typeof updateProfileSchema>;

export {
  googleStartQuerySchema,
  googleCallbackQuerySchema,
  requestEmailCodeSchema,
  verifyEmailCodeSchema,
  exchangeCodeSchema,
  refreshTokenSchema,
  updateProfileSchema,
  type UpdateProfileInputType,
};
