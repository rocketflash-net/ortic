import { StatusCodes } from "http-status-codes";
import ResponseCodeEnum from "@enums/response-code.enum";
import HttpException from "@exceptions/http.exception";

// Optimistic locking: event sudah diubah di tab/perangkat lain, dashboard harus memuat ulang (US-17).
export default class VersionConflictException extends HttpException {
  constructor(currentVersion: number) {
    super(StatusCodes.CONFLICT, ResponseCodeEnum.version_conflict, "Event was modified elsewhere, please reload", { current_version: currentVersion });
  }
}
