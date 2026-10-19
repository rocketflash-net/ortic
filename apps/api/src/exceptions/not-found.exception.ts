import { StatusCodes } from "http-status-codes";
import ResponseCodeEnum from "@enums/response-code.enum";
import HttpException from "@exceptions/http.exception";

export default class NotFoundException extends HttpException {
  constructor(message: string = "Resource not found", additionalInfo: unknown = null) {
    super(StatusCodes.NOT_FOUND, ResponseCodeEnum.not_found, message, additionalInfo);
  }
}
