import { StatusCodes } from "http-status-codes";
import ResponseCodeEnum from "@enums/response-code.enum";
import HttpException from "@exceptions/http.exception";

export default class ForbiddenException extends HttpException {
  constructor(message: string = "You do not have access to this resource", additionalInfo: unknown = null) {
    super(StatusCodes.FORBIDDEN, ResponseCodeEnum.forbidden, message, additionalInfo);
  }
}
