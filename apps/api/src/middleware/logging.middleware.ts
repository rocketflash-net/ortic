import { NextFunction, Request, Response } from "express";
import { logger } from "@config/logger.config";
import { maskSensitiveFields, maskSensitiveQueryParams } from "@utils/general.util";
import { currentRequestId } from "@utils/request-context.util";

const EXCLUDED_LOG_PATHS = ["/health", "/health/ready"];

const parseBody = (body: unknown): unknown => {
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

/**
 * Log setiap incoming request & outgoing response (field sensitif di-mask).
 * Pasang setelah requestContextMiddleware supaya kedua log membawa requestId yang sama.
 */
const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  const path = req.path.replace(/\/+$/, "") || "/";
  if (EXCLUDED_LOG_PATHS.includes(path)) {
    next();
    return;
  }

  // Event "finish" bisa berjalan di luar konteks async request, jadi requestId diikat ke child logger.
  const log = logger.child({ requestId: currentRequestId() });
  const url = maskSensitiveQueryParams(req.originalUrl);
  log.info({ method: req.method, url, body: maskSensitiveFields(req.body ?? {}) }, "incoming request");

  let responseBody: unknown;
  const originalSend = res.send.bind(res);
  res.send = ((body: unknown) => {
    responseBody = body;
    return originalSend(body);
  }) as Response["send"];

  res.on("finish", () => {
    log.info(
      { method: req.method, url, statusCode: res.statusCode, responseTimeMs: Date.now() - startTime, body: maskSensitiveFields(parseBody(responseBody) ?? {}) },
      "request completed"
    );
  });

  next();
};

export default loggingMiddleware;
