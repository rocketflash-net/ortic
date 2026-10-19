import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";
import { logger } from "@config/logger.config";
import HttpException from "@exceptions/http.exception";
import BatpayCallbackAuthHelper from "@helpers/batpay/batpay-callback-auth.helper";
import { snapResponseCode } from "@helpers/batpay/batpay-snap";
import BatpayPaymentGateway from "@helpers/payment/batpay-payment.gateway";
import PaymentWebhookService from "@services/payment-webhook.service";
import { requestPath } from "@utils/request.util";

/**
 * Endpoint yang dipanggil server BatPay (bukan browser). Response WAJIB format SNAP
 * `{ responseCode, responseMessage }`, bukan envelope API kita. BatPay akan me-retry notifikasi
 * yang dibalas 5xx, jadi error yang tidak akan berubah walau dicoba ulang (signature salah, order tidak ada,
 * nominal tidak cocok) dibalas 4xx.
 *
 * Daftarkan URL berikut di konfigurasi merchant BatPay:
 * - auth URL   : {API_URL}/api/v1/webhooks/batpay/v1.0/access-token/b2b
 * - notify URL : {API_URL}/api/v1/webhooks/batpay/v1.0/qr/qr-mpm-notify
 */
const ACCESS_TOKEN_SERVICE_CODE = "73";
const QRIS_NOTIFY_SERVICE_CODE = "52";

const callbackAuth = new BatpayCallbackAuthHelper();
const webhookService = new PaymentWebhookService(new BatpayPaymentGateway());

const sendSnapError = (res: Response, error: unknown, serviceCode: string) => {
  if (error instanceof ZodError) {
    const fields = error.issues.map((issue) => issue.path.join(".")).join(", ");
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ responseCode: snapResponseCode(StatusCodes.BAD_REQUEST, serviceCode, "02"), responseMessage: `Invalid Mandatory Field ${fields}` });
    return;
  }

  if (error instanceof HttpException && error.status < StatusCodes.INTERNAL_SERVER_ERROR) {
    res.status(error.status).json({ responseCode: snapResponseCode(error.status, serviceCode, "00"), responseMessage: error.message });
    return;
  }

  logger.error({ err: error }, "[batpay] callback failed");
  res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .json({ responseCode: snapResponseCode(StatusCodes.INTERNAL_SERVER_ERROR, serviceCode, "01"), responseMessage: "Internal Server Error" });
};

// POST /webhooks/batpay/v1.0/access-token/b2b — BatPay meminta token sebelum mengirim notifikasi.
const accessToken = async (req: Request, res: Response) => {
  try {
    const token = await callbackAuth.issueAccessToken(req.headers);
    res.status(StatusCodes.OK).json({
      responseCode: snapResponseCode(StatusCodes.OK, ACCESS_TOKEN_SERVICE_CODE),
      responseMessage: "Successful",
      accessToken: token.accessToken,
      tokenType: "Bearer",
      expiresIn: token.expiresIn,
      additionalInfo: {},
    });
  } catch (error) {
    sendSnapError(res, error, ACCESS_TOKEN_SERVICE_CODE);
  }
};

// POST /webhooks/batpay/v1.0/qr/qr-mpm-notify — notifikasi status pembayaran QRIS.
const qrisNotify = async (req: Request, res: Response) => {
  try {
    await webhookService.handle({ headers: req.headers, body: req.body, rawBody: req.rawBody, path: requestPath(req) });
    res.status(StatusCodes.OK).json({ responseCode: snapResponseCode(StatusCodes.OK, QRIS_NOTIFY_SERVICE_CODE), responseMessage: "Successful" });
  } catch (error) {
    sendSnapError(res, error, QRIS_NOTIFY_SERVICE_CODE);
  }
};

export { accessToken, qrisNotify };
