import { StatusCodes } from "http-status-codes";
import ResponseCodeEnum from "@enums/response-code.enum";
import HttpException from "@exceptions/http.exception";

export default class BadRequestException extends HttpException {
  constructor(message: string = "Bad request", additionalInfo: unknown = null) {
    super(StatusCodes.BAD_REQUEST, ResponseCodeEnum.bad_request, message, additionalInfo);
  }
}
