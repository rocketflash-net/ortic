import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";
import { isProduction } from "@config/app.config";
import { logger } from "@config/logger.config";
import ResponseDto from "@dto/response.dto";
import ResponseCodeEnum from "@enums/response-code.enum";
import HttpException from "@exceptions/http.exception";
import ValidationException from "@exceptions/validation.exception";
import { formatZodIssues } from "@utils/validation.util";

const isJsonSyntaxError = (err: Error): boolean => err instanceof SyntaxError && "body" in err;

// Error handler global. Harus didaftarkan paling akhir di app.ts.
const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Hasil `schema.parse()` di controller yang gagal -> 422 dengan daftar field.
  const error = err instanceof ZodError ? new ValidationException(formatZodIssues(err)) : err;
  const response = new ResponseDto();

  if (error instanceof HttpException) {
    response.setResponseCode(error.code).setResponseMessage(error.message).setAdditionalInfo(error.additionalInfo);
    res.status(error.status).json(response.toArray());
    return;
  }

  if (isJsonSyntaxError(error)) {
    response.setResponseCode(ResponseCodeEnum.bad_request).setResponseMessage("Invalid JSON payload");
    res.status(StatusCodes.BAD_REQUEST).json(response.toArray());
    return;
  }

  // Error tak terduga: log detailnya, tapi jangan bocorkan ke client di production.
  logger.error({ err: error }, "unhandled error");
  response.setResponseCode(ResponseCodeEnum.general_error).setResponseMessage(isProduction() ? "Internal server error" : error.message);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(response.toArray());
};

export default errorHandler;
