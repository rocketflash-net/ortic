import type { AuthUserType } from "@@types/auth.type";

// Properti tambahan di Request Express.
declare global {
  namespace Express {
    interface Request {
      // Diisi middleware/auth.middleware.ts
      user?: AuthUserType;
      // Id sesi dari klaim `sid` access token (untuk logout).
      sessionId?: string;
      // Body mentah request webhook (app.ts), untuk verifikasi signature provider pembayaran.
      rawBody?: string;
    }
  }
}

export {};
