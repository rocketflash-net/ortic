import { StatusCodes } from "http-status-codes";
import ResponseCodeEnum from "@enums/response-code.enum";
import HttpException from "@exceptions/http.exception";

// Refresh token salah, kedaluwarsa, sudah dirotasi, atau sesinya dicabut. Client harus login ulang.
export default class InvalidRefreshTokenException extends HttpException {
  constructor() {
    super(StatusCodes.UNAUTHORIZED, ResponseCodeEnum.invalid_refresh_token, "Invalid or expired refresh token");
  }
}
