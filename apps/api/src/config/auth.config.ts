import { CookieOptions } from "express";
import { isProduction } from "@config/app.config";
import { env, envNumber } from "@config/env.config";

// Hanya untuk development: production wajib mengisi JWT_SECRET (divalidasi saat start, env.config.ts).
const DEV_JWT_SECRET = "dev-only-insecure-jwt-secret-change-me-0000";

const authConfig = {
  google: {
    clientId: env("GOOGLE_CLIENT_ID"),
    clientSecret: env("GOOGLE_CLIENT_SECRET"),
    // Harus sama persis dengan "Authorized redirect URI" di Google Cloud Console.
    redirectUri: env("GOOGLE_REDIRECT_URI", "http://localhost:4000/api/v1/auth/google/callback"),
  },
  // Access token: JWT di header `Authorization: Bearer`, berumur pendek.
  jwt: {
    secret: env("JWT_SECRET") || (isProduction() ? "" : DEV_JWT_SECRET),
    issuer: "ortic-api",
    audience: "ortic-app",
    accessTokenTtlSeconds: 15 * 60,
  },
  // Masa berlaku sesi (refresh token), absolut sejak login: refresh tidak memperpanjangnya.
  sessionTtlDays: envNumber("SESSION_TTL_DAYS", 30),
  refreshToken: {
    // Sesi dicabut jika tidak di-refresh selama ini (perangkat lama / token curian yang tidak dipakai pemiliknya).
    idleDays: 7,
    // Token sebelumnya masih diterima selama ini setelah rotasi: retry karena respons hilang di jaringan, atau dua
    // refresh bersamaan. Di luar jendela ini, token sebelumnya = dicuri -> sesi dicabut.
    reuseGraceSeconds: 30,
  },
  // Batas perangkat (sesi aktif) per user; login baru mengeluarkan sesi yang paling lama tidak dipakai.
  maxSessionsPerUser: 3,
  // Kode sekali pakai untuk menukar hasil login Google menjadi token (dashboard -> POST /auth/google/exchange).
  exchangeCodeTtlSeconds: 60,
  // Cookie pendek-umur berisi state + PKCE verifier selama proses OAuth Google (bukan cookie sesi).
  oauthCookieName: "oauth_flow",
  oauthTtlMinutes: 10,
  // Login lewat kode OTP email.
  emailCode: {
    ttlMinutes: 10,
    // Percobaan salah per kode sebelum kode ditolak.
    maxAttempts: 5,
    // Jeda minimal sebelum kode baru boleh diminta untuk email yang sama.
    resendCooldownSeconds: 180,
    // Batas kode per email per jam, supaya inbox orang lain tidak bisa dibanjiri.
    maxPerHour: 5,
    // Dummy OTP untuk development: jika diisi, setiap kode login = nilai ini (tetap dikirim lewat mailer).
    // Selalu kosong di production (dan ditolak saat start, env.config.ts).
    devFixedCode: isProduction() ? "" : env("AUTH_DEV_LOGIN_CODE"),
  },
};

// Cookie OAuth hanya dipakai antara redirect ke Google dan callback-nya, di domain API sendiri.
const oauthCookieOptions = (maxAgeMs: number): CookieOptions => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: "lax",
  path: "/",
  maxAge: maxAgeMs,
});

export { authConfig, oauthCookieOptions };
