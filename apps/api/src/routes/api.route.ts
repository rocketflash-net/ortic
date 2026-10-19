import { Request, Response, Router } from "express";
import { StatusCodes } from "http-status-codes";
import { appConfig } from "@config/app.config";
import { checkDatabaseConnection } from "@config/database.config";
import { logger } from "@config/logger.config";
import ResponseDto from "@dto/response.dto";
import ResponseCodeEnum from "@enums/response-code.enum";
import v1Route from "@routes/v1/index.route";

const router = Router();

const readinessCheck = async (_req: Request, res: Response) => {
  try {
    await checkDatabaseConnection();
    res.status(StatusCodes.OK).json(new ResponseDto().setResponseMessage("Ready").setData({ database: "up" }).toArray());
  } catch (error) {
    logger.warn({ err: error }, "readiness check failed: database unreachable");
    res
      .status(StatusCodes.SERVICE_UNAVAILABLE)
      .json(new ResponseDto().setResponseCode(ResponseCodeEnum.general_error).setResponseMessage("Not ready").setData({ database: "down" }).toArray());
  }
};

const healthCheck = (_req: Request, res: Response) => {
  const response = new ResponseDto().setResponseMessage(`${appConfig.name} is running`).setData({ env: appConfig.env, uptime: Math.floor(process.uptime()) });
  res.status(StatusCodes.OK).json(response.toArray());
};

router.get("/", healthCheck);
router.get("/health", healthCheck);
// Readiness: siap menerima traffic hanya jika database bisa diakses (untuk load balancer / orchestrator).
router.get("/health/ready", readinessCheck);

router.use("/api/v1", v1Route);

export default router;
