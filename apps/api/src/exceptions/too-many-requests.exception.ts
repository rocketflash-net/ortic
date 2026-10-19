import { StatusCodes } from "http-status-codes";
import ResponseCodeEnum from "@enums/response-code.enum";
import HttpException from "@exceptions/http.exception";

export default class TooManyRequestsException extends HttpException {
  constructor(message: string = "Too many requests, please try again later.", additionalInfo: unknown = null) {
    super(StatusCodes.TOO_MANY_REQUESTS, ResponseCodeEnum.too_many_requests, message, additionalInfo);
  }
}
