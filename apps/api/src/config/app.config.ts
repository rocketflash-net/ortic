import { env, envBoolean, envList, envNumber } from "@config/env.config";
import EnvEnum from "@enums/env.enum";

const appConfig = {
  name: env("APP_NAME", "Ortic API"),
  env: env("NODE_ENV", EnvEnum.local),
  port: envNumber("PORT", 4000),
  // Jumlah reverse proxy di depan API (untuk req.ip & rate limit). 0 = tanpa proxy.
  trustProxy: envNumber("TRUST_PROXY", 1),
  useLogger: envBoolean("USE_LOGGER", true),
  useCompression: envBoolean("USE_COMPRESSION", false),
  useLimiter: envBoolean("USE_LIMITER", false),

  // URL frontend: dipakai untuk CORS, cek Origin, redirect login, dan link undangan.
  adminUrl: env("ADMIN_URL", "http://localhost:5700"),
  webUrl: env("WEB_URL", "http://localhost:5600"),
  extraCorsOrigins: envList("CORS_ORIGINS"),

  expirationJobIntervalMs: envNumber("EXPIRATION_JOB_INTERVAL_MS", 60 * 1000),
};

const isProduction = (): boolean => appConfig.env === EnvEnum.production;

// Origin frontend yang boleh memanggil API dari browser (CORS).
const allowedOrigins = (): string[] => [appConfig.webUrl, appConfig.adminUrl, ...appConfig.extraCorsOrigins];

export { appConfig, isProduction, allowedOrigins };
