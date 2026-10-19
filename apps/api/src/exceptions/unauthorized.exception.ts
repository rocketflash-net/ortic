import { StatusCodes } from "http-status-codes";
import ResponseCodeEnum from "@enums/response-code.enum";
import HttpException from "@exceptions/http.exception";

export default class UnauthorizedException extends HttpException {
  constructor(message: string = "Unauthenticated", additionalInfo: unknown = null) {
    super(StatusCodes.UNAUTHORIZED, ResponseCodeEnum.unauthorized, message, additionalInfo);
  }
}
