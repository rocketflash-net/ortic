import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";
import { requestContext } from "@utils/request-context.util";

const MAX_REQUEST_ID_LENGTH = 100;

/**
 * Beri setiap request sebuah id: dari header `x-request-id` (mis. dari reverse proxy) atau UUID baru.
 * Id dikembalikan di response header dan dipakai semua log selama request berjalan.
 */
const requestContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.header("x-request-id");
  const requestId = incoming && incoming.length <= MAX_REQUEST_ID_LENGTH ? incoming : randomUUID();
  res.setHeader("x-request-id", requestId);
  requestContext.run({ requestId }, next);
};

export default requestContextMiddleware;
