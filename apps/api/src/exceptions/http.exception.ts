import { StatusCodes } from "http-status-codes";
import ResponseCodeEnum from "@enums/response-code.enum";

/**
 * Base exception untuk semua error yang "diketahui" (expected error).
 * Error middleware mengubahnya menjadi response JSON dengan HTTP status & responseCode yang sesuai.
 */
export default class HttpException extends Error {
  private readonly _status: number;
  private readonly _code: string;
  private readonly _additionalInfo: unknown;

  constructor(
    status: number = StatusCodes.INTERNAL_SERVER_ERROR,
    code: string = ResponseCodeEnum.general_error,
    message: string = "Internal server error",
    additionalInfo: unknown = null
  ) {
    super(message);
    this.name = new.target.name;
    this._status = status;
    this._code = code;
    this._additionalInfo = additionalInfo;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  get status() {
    return this._status;
  }

  get code() {
    return this._code;
  }

  get additionalInfo() {
    return this._additionalInfo;
  }
}
