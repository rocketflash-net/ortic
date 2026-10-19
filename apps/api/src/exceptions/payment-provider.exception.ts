import { StatusCodes } from "http-status-codes";
import ResponseCodeEnum from "@enums/response-code.enum";
import HttpException from "@exceptions/http.exception";

// Provider pembayaran menolak / gagal merespons. Detail asli dicatat di log, bukan dikirim ke client.
export default class PaymentProviderException extends HttpException {
  constructor(message: string = "Payment provider is unavailable, please try again") {
    super(StatusCodes.BAD_GATEWAY, ResponseCodeEnum.payment_provider_error, message);
  }
}
