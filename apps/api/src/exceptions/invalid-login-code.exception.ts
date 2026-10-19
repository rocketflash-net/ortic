import { StatusCodes } from "http-status-codes";
import ResponseCodeEnum from "@enums/response-code.enum";
import HttpException from "@exceptions/http.exception";

// Kode OTP email salah, kedaluwarsa, sudah dipakai, atau sudah terlalu banyak dicoba. Sengaja tidak dibedakan.
export default class InvalidLoginCodeException extends HttpException {
  constructor() {
    super(StatusCodes.UNAUTHORIZED, ResponseCodeEnum.invalid_login_code, "Invalid or expired login code");
  }
}
