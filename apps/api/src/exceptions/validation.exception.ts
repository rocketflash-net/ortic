import { StatusCodes } from "http-status-codes";
import ResponseCodeEnum from "@enums/response-code.enum";
import HttpException from "@exceptions/http.exception";

export default class ValidationException extends HttpException {
  constructor(errors: unknown, message: string = "Validation error") {
    super(StatusCodes.UNPROCESSABLE_ENTITY, ResponseCodeEnum.validation_error, message, errors);
  }
}
