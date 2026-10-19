import { IncomingMessage, ServerResponse } from "http";
import express, { Request } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import { allowedOrigins, appConfig } from "@config/app.config";
import { globalLimiter } from "@config/rate-limit.config";
import routers from "@routes/api.route";
import storageRoute from "@routes/storage.route";
import StorageHelper from "@helpers/storage.helper";
import errorHandler from "@middleware/errors.middleware";
import notFoundHandler from "@middleware/not-found.middleware";
import requestContextMiddleware from "@middleware/request-context.middleware";
import loggingMiddleware from "@middleware/logging.middleware";

const WEBHOOK_PATH_PREFIX = "/api/v1/webhooks/";

// Signature webhook dihitung dari body mentah, jadi simpan salinannya sebelum di-parse menjadi JSON.
const keepWebhookRawBody = (req: IncomingMessage, _res: ServerResponse, buffer: Buffer) => {
  if (req.url?.startsWith(WEBHOOK_PATH_PREFIX)) (req as Request).rawBody = buffer.toString("utf8");
};

/**
 * Membuat instance Express (middleware + routes). Proses listen port ada di index.ts.
 */
const createApp = () => {
  const app = express();

  app.set("trust proxy", appConfig.trustProxy);
  // Paling awal: semua middleware & log berikutnya berjalan di dalam konteks request (requestId).
  app.use(requestContextMiddleware);
  // Hanya frontend kita yang boleh memanggil API dari browser. Autentikasi lewat header Authorization (tanpa cookie sesi).
  app.use(cors({ origin: allowedOrigins() }));
  app.use(helmet());
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json({ limit: "1mb", verify: keepWebhookRawBody }));

  if (appConfig.useCompression) app.use(compression());
  if (appConfig.useLogger) app.use(loggingMiddleware);
  if (appConfig.useLimiter) app.use(globalLimiter);

  // Driver storage local (development): upload & file publik disajikan API sendiri.
  if (StorageHelper.isLocalDriver()) app.use("/storage", storageRoute);

  app.use(routers);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;
