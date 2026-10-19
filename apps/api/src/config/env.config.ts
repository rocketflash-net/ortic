import dotenv from "dotenv";
import { z } from "zod";
import EnvEnum from "@enums/env.enum";

dotenv.config({ quiet: true });

const env = (key: string, defaultValue = ""): string => process.env[key] ?? defaultValue;

const envNumber = (key: string, defaultValue: number): number => {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  const value = Number(raw);
  return Number.isFinite(value) ? value : defaultValue;
};

const envBoolean = (key: string, defaultValue: boolean): boolean => {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw.toLowerCase() === "true";
};

// Daftar dipisah koma, contoh: CORS_ORIGINS=https://a.com,https://b.com
const envList = (key: string): string[] =>
  env(key)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

// ---------------------------------------------------------------------------
// Validasi saat start. Default tetap ditentukan di masing-masing file config; skema ini hanya menolak nilai
// yang salah format (yang tanpa validasi akan diam-diam jatuh ke default) dan nilai wajib di production.
// ---------------------------------------------------------------------------

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema.optional());

const numberVar = optional(z.string().regex(/^-?\d+(\.\d+)?$/, "must be a number"));
const booleanVar = optional(z.string().regex(/^(true|false)$/i, 'must be "true" or "false"'));
const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value) && URL.canParse(value);
const urlVar = optional(z.string().refine(isHttpUrl, "must be an http(s) URL"));

const NUMBER_KEYS = [
  "PORT",
  "TRUST_PROXY",
  "RATE_LIMIT_WINDOW_MS",
  "RATE_LIMIT_MAX",
  "AUTH_EMAIL_RATE_LIMIT_WINDOW_MS",
  "AUTH_EMAIL_RATE_LIMIT_MAX",
  "AREA_SEARCH_RATE_LIMIT_WINDOW_MS",
  "AREA_SEARCH_RATE_LIMIT_MAX",
  "EXPIRATION_JOB_INTERVAL_MS",
  "DB_PORT",
  "DB_POOL_MAX",
  "SESSION_TTL_DAYS",
  "SMTP_PORT",
  "PAYMENT_ORDER_TTL_MINUTES",
  "BATPAY_CALLBACK_TOKEN_TTL_SECONDS",
  "BATPAY_MAX_TIMESTAMP_SKEW_SECONDS",
  "BATPAY_TIMEOUT_MS",
  "STORAGE_PRESIGN_EXPIRES_SECONDS",
  "QRIS_MDR_RATE",
  "QRIS_MDR_FREE_MAX",
] as const;

const BOOLEAN_KEYS = ["AUTO_ACCEPT_ORDERS", "BITESHIP_MOCK_RATES", "USE_LOGGER", "USE_COMPRESSION", "USE_LIMITER", "DB_LOGGING", "SMTP_SECURE", "STORAGE_FORCE_PATH_STYLE"] as const;

const URL_KEYS = ["WEB_URL", "ADMIN_URL", "GOOGLE_REDIRECT_URI", "STORAGE_ENDPOINT", "STORAGE_PUBLIC_URL", "BATPAY_BASE_URL", "BITESHIP_BASE_URL"] as const;

// Tanpa nilai ini aplikasi production tidak bisa dipakai (login, database, upload, link frontend).
// Kredensial provider (BatPay, SMTP) diperiksa oleh factory provider-nya saat start.
// Secret HS256 minimal 256-bit (32 byte) supaya access token tidak bisa dipalsukan dengan brute force.
const MIN_JWT_SECRET_LENGTH = 32;

const PRODUCTION_REQUIRED_KEYS = [
  "WEB_URL",
  "ADMIN_URL",
  "JWT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "DB_HOST",
  "DB_USERNAME",
  "DB_PASSWORD",
  "DB_DATABASE",
  "STORAGE_ENDPOINT",
  "STORAGE_BUCKET",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
  "STORAGE_PUBLIC_URL",
] as const;

const envSchema = z
  .object({
    NODE_ENV: optional(z.enum(Object.values(EnvEnum) as [string, ...string[]])),
    LOG_LEVEL: optional(z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])),
    AUTH_DEV_LOGIN_CODE: optional(z.string().regex(/^\d{6}$/, "must be 6 digits")),
    CORS_ORIGINS: optional(z.string().refine((value) => value.split(",").every((origin) => !origin.trim() || isHttpUrl(origin.trim())), "must be comma-separated http(s) URLs")),
    ...Object.fromEntries(NUMBER_KEYS.map((key) => [key, numberVar])),
    ...Object.fromEntries(BOOLEAN_KEYS.map((key) => [key, booleanVar])),
    ...Object.fromEntries(URL_KEYS.map((key) => [key, urlVar])),
  })
  .loose()
  .superRefine((values, ctx) => {
    if (values.NODE_ENV !== EnvEnum.production) return;

    if (values.AUTH_DEV_LOGIN_CODE) ctx.addIssue({ code: "custom", path: ["AUTH_DEV_LOGIN_CODE"], message: "must not be set in production" });

    for (const key of PRODUCTION_REQUIRED_KEYS) {
      if (!values[key]) ctx.addIssue({ code: "custom", path: [key], message: "is required in production" });
    }
    for (const key of ["WEB_URL", "ADMIN_URL", "GOOGLE_REDIRECT_URI"] as const) {
      const value = values[key];
      if (typeof value === "string" && !value.startsWith("https://")) ctx.addIssue({ code: "custom", path: [key], message: "must use https in production" });
    }
    if (typeof values.JWT_SECRET === "string" && values.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
      ctx.addIssue({ code: "custom", path: ["JWT_SECRET"], message: `must be at least ${MIN_JWT_SECRET_LENGTH} characters` });
    }
  });

/**
 * Validasi seluruh environment variable sekaligus, dipanggil sekali saat aplikasi start.
 * Gagal dengan daftar semua masalah, supaya salah konfigurasi ketahuan saat deploy, bukan saat fitur dipakai.
 */
const validateEnv = (source: NodeJS.ProcessEnv = process.env): void => {
  const result = envSchema.safeParse(source);
  if (result.success) return;

  const problems = result.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${problems.join("\n")}`);
};

export { env, envNumber, envBoolean, envList, validateEnv };
