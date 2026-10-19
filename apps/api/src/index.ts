import "./paths";
import "@config/validate-env";
import { appConfig } from "@config/app.config";
import { authConfig } from "@config/auth.config";
import { checkDatabaseConnection, closeDatabaseConnection } from "@config/database.config";
import { logger } from "@config/logger.config";
import { startExpirationJob } from "@jobs/expiration.job";
import createApp from "./app";

// Batas waktu graceful shutdown; setelah itu proses dipaksa berhenti (mis. koneksi keep-alive yang tidak menutup).
const SHUTDOWN_TIMEOUT_MS = 10_000;

const bootstrap = async (): Promise<void> => {
  // Fail fast: jangan terima request kalau database tidak bisa diakses.
  await checkDatabaseConnection();

  const app = createApp();
  const server = app.listen(appConfig.port, () => {
    logger.info({ port: appConfig.port }, `${appConfig.name} listening on port ${appConfig.port} environment ${appConfig.env}`);
  });
  if (authConfig.emailCode.devFixedCode) logger.warn("AUTH_DEV_LOGIN_CODE is set: every email login code is the fixed dev code");
  const stopExpirationJob = startExpirationJob();

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down gracefully...");

    const forceExit = setTimeout(() => {
      logger.error({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, "graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    stopExpirationJob();
    // Tutup koneksi idle supaya server.close() tidak menunggu keep-alive.
    server.closeIdleConnections();
    server.close(async () => {
      await closeDatabaseConnection();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandled rejection");
});

// State proses tidak bisa dipercaya setelah exception yang tidak tertangkap: catat lalu keluar (process manager me-restart).
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "uncaught exception");
  process.exit(1);
});

bootstrap().catch((error) => {
  logger.fatal({ err: error }, "failed to start application");
  process.exit(1);
});
