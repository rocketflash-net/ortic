import { StatusCodes } from "http-status-codes";
import ResponseCodeEnum from "@enums/response-code.enum";
import HttpException from "@exceptions/http.exception";

// Biteship menolak / gagal merespons. Detail asli dicatat di log, bukan dikirim ke client.
export default class ShippingProviderException extends HttpException {
  constructor(
    message: string = "Shipping provider is unavailable, please try again",
    // Kode error Biteship (mis. 40001010 = tidak ada kurir untuk rute ini), null bila tidak ada.
    readonly providerCode: number | null = null
  ) {
    super(StatusCodes.BAD_GATEWAY, ResponseCodeEnum.shipping_provider_error, message);
  }
}
