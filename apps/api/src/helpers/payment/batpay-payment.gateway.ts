import { z } from "zod";
import { batpayConfig } from "@config/batpay.config";
import UnauthorizedException from "@exceptions/unauthorized.exception";
import BatpayApiHelper from "@helpers/batpay/batpay-api.helper";
import BatpayCallbackAuthHelper from "@helpers/batpay/batpay-callback-auth.helper";
import { isFreshTimestamp, parseSnapAmount, toSnapAmount, toSnapTimestamp, transactionStringToSign, verifyHmacSha512 } from "@helpers/batpay/batpay-snap";
import PaymentGatewayInterface from "@interfaces/payment-gateway.interface";
import {
  CreateQrisInputType,
  CreateQrisResultType,
  PaymentCancelInputType,
  PaymentNotificationType,
  PaymentQueryInputType,
  PaymentWebhookInputType,
} from "@@types/payment.type";
import { randomCode } from "@utils/crypto.util";
import { headerValue } from "@utils/request.util";

// latestTransactionStatus BatPay -> status notifikasi kita. 00 = lunas; 05 (dibatalkan/kedaluwarsa) & 06 = gagal;
// lainnya (01 Initiated, 02 Paying, 03 Pending, 04 Refunded, 07 Not found) tidak mengubah pesanan.
const STATUS_MAP: Record<string, PaymentNotificationType["status"]> = {
  "00": "paid",
  "05": "failed",
  "06": "failed",
};

const notificationSchema = z.object({
  originalPartnerReferenceNo: z.string().min(1),
  originalReferenceNo: z.string().nullish(),
  latestTransactionStatus: z.string().min(1),
  amount: z.object({ value: z.union([z.string(), z.number()]), currency: z.string().optional() }),
});

/**
 * QRIS MPM dinamis via BatPay Open API (SNAP) — https://developer.batbiz.id
 * - Generate : POST /api/v1.0/qr/qr-mpm-generate (partnerReferenceNo = provider_ref order kita)
 * - Notifikasi: BatPay -> POST /api/v1/webhooks/batpay/v1.0/qr/qr-mpm-notify (lihat batpay.controller.ts)
 * - Cek status: POST /api/v1.0/qr/qr-mpm-query (halaman bayar polling, job kedaluwarsa)
 * - Batal     : POST /api/v1.0/qr/qr-mpm-cancel (pembeli membatalkan / QR kedaluwarsa)
 */
export default class BatpayPaymentGateway implements PaymentGatewayInterface {
  readonly name = "batpay";

  constructor(
    private readonly api: BatpayApiHelper = new BatpayApiHelper(),
    private readonly callbackAuth: BatpayCallbackAuthHelper = new BatpayCallbackAuthHelper()
  ) {}

  async createQris(input: CreateQrisInputType): Promise<CreateQrisResultType> {
    // Unik per percobaan bayar (maks 64 karakter); BatPay mengirimnya balik sebagai originalPartnerReferenceNo.
    const partnerReferenceNo = `ORT-${input.orderId}-${randomCode(10)}`;
    const response = await this.api.generateQris({
      partnerReferenceNo,
      merchantId: batpayConfig.merchantId,
      amount: { value: toSnapAmount(input.amount), currency: "IDR" },
      validityPeriod: toSnapTimestamp(input.expiresAt),
    });

    return { providerRef: partnerReferenceNo, providerTransactionId: response.referenceNo, qrString: response.qrContent, expiresAt: input.expiresAt };
  }

  async queryStatus({ providerRef, providerTransactionId }: PaymentQueryInputType): Promise<PaymentNotificationType> {
    const result = await this.api.queryQris(providerRef, providerTransactionId);
    return {
      providerRef,
      amount: result.amount ? parseSnapAmount(result.amount.value) : 0,
      status: STATUS_MAP[result.latestTransactionStatus] ?? "pending",
    };
  }

  async cancelQris({ providerRef, providerTransactionId, amount, reason }: PaymentCancelInputType): Promise<void> {
    await this.api.cancelQris({ partnerReferenceNo: providerRef, referenceNo: providerTransactionId, amount: toSnapAmount(amount), reason });
  }

  /**
   * Verifikasi notifikasi BatPay sesuai SNAP:
   * 1. Bearer token = token yang kita terbitkan lewat /webhooks/batpay/v1.0/access-token/b2b
   * 2. X-PARTNER-ID milik kita & X-TIMESTAMP masih segar
   * 3. X-SIGNATURE = HMAC-SHA512(secret, POST:path:token:sha256(body):timestamp)
   */
  async parseWebhook({ headers, body, rawBody, path }: PaymentWebhookInputType): Promise<PaymentNotificationType> {
    const accessToken = headerValue(headers, "authorization")?.replace(/^Bearer\s+/i, "");
    const timestamp = headerValue(headers, "X-TIMESTAMP");
    const signature = headerValue(headers, "X-SIGNATURE");
    if (!accessToken || !timestamp || !signature) throw new UnauthorizedException("Unauthorized. Missing signature headers");

    await this.callbackAuth.verifyAccessToken(accessToken);
    if (headerValue(headers, "X-PARTNER-ID") !== batpayConfig.partnerId) throw new UnauthorizedException("Unauthorized. Unknown Partner");
    if (!isFreshTimestamp(timestamp, batpayConfig.maxTimestampSkewSeconds)) throw new UnauthorizedException("Unauthorized. Invalid Timestamp");

    const stringToSign = transactionStringToSign({ method: "POST", path, accessToken, rawBody: rawBody ?? JSON.stringify(body), timestamp });
    if (!verifyHmacSha512(stringToSign, signature, batpayConfig.secretKey)) throw new UnauthorizedException("Unauthorized. Invalid Signature");

    const payload = notificationSchema.parse(body);
    return {
      providerRef: payload.originalPartnerReferenceNo,
      amount: parseSnapAmount(payload.amount.value),
      status: STATUS_MAP[payload.latestTransactionStatus] ?? "pending",
    };
  }
}
