import { StatusCodes } from "http-status-codes";
import ResponseCodeEnum from "@enums/response-code.enum";
import HttpException from "@exceptions/http.exception";

// Menurunkan superadmin terakhir akan membuat tidak ada yang bisa mengelola admin.
export default class LastAdminException extends HttpException {
  constructor() {
    super(StatusCodes.CONFLICT, ResponseCodeEnum.last_admin, "Cannot remove the last superadmin");
  }
}
