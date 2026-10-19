import pino from "pino";
import { appConfig } from "@config/app.config";
import { env } from "@config/env.config";
import EnvEnum from "@enums/env.enum";
import { currentRequestId } from "@utils/request-context.util";

/**
 * Logger aplikasi: JSON terstruktur (satu baris per event) supaya mudah dicari & difilter di production.
 * - requestId dari request yang sedang berjalan ditambahkan otomatis (lihat request-context.middleware.ts).
 * - Saat NODE_ENV=local, output dirapikan dengan pino-pretty (devDependency, tidak dipakai di server).
 * Pakai `logger.info({ ...data }, "pesan")`; error dikirim sebagai `{ err }` supaya stack ikut tercatat.
 */
const logger = pino({
  // `||`: LOG_LEVEL kosong di .env (seperti di .env.example) berarti pakai default, bukan level "".
  level: env("LOG_LEVEL") || (appConfig.env === EnvEnum.production ? "info" : "debug"),
  base: { app: appConfig.name, env: appConfig.env },
  timestamp: pino.stdTimeFunctions.isoTime,
  mixin: () => {
    const requestId = currentRequestId();
    return requestId ? { requestId } : {};
  },
  transport: appConfig.env === EnvEnum.local ? { target: "pino-pretty", options: { translateTime: "SYS:HH:MM:ss.l", ignore: "pid,hostname,app,env" } } : undefined,
});

export { logger };
