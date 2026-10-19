import { StatusCodes } from "http-status-codes";
import ResponseCodeEnum from "@enums/response-code.enum";
import HttpException from "@exceptions/http.exception";

export default class ConflictException extends HttpException {
  constructor(message: string = "Resource already exists", additionalInfo: unknown = null) {
    super(StatusCodes.CONFLICT, ResponseCodeEnum.conflict, message, additionalInfo);
  }
}
