import { z } from "zod";
import Helper from "@base/helper.base";
import { batpayConfig, batpayPrivateKey } from "@config/batpay.config";
import { logger } from "@config/logger.config";
import HttpException from "@exceptions/http.exception";
import PaymentProviderException from "@exceptions/payment-provider.exception";
import { accessTokenStringToSign, signHmacSha512, signRsaSha256, snapExternalId, toSnapTimestamp, transactionStringToSign } from "@helpers/batpay/batpay-snap";

const ACCESS_TOKEN_PATH = "/api/v1.0/access-token/b2b";
const GENERATE_QRIS_PATH = "/api/v1.0/qr/qr-mpm-generate";
// Dokumentasi BatBiz (developer.batbiz.id): SNAP - API / QRIS MPM / Query Payment Status & Payment Cancellation.
const QUERY_QRIS_PATH = "/api/v1.0/qr/qr-mpm-query";
const CANCEL_QRIS_PATH = "/api/v1.0/qr/qr-mpm-cancel";
// serviceCode transaksi asal yang dicek: Generate QRIS MPM = 47.
const QRIS_MPM_SERVICE_CODE = "47";
// Token diperbarui sedikit sebelum benar-benar kedaluwarsa.
const TOKEN_REFRESH_MARGIN_MS = 60 * 1000;

const accessTokenResponseSchema = z.object({ accessToken: z.string().min(1), expiresIn: z.coerce.number().positive() });

const generateQrisResponseSchema = z.object({ referenceNo: z.string().min(1), partnerReferenceNo: z.string(), qrContent: z.string().min(1) });

const queryQrisResponseSchema = z.object({
  originalReferenceNo: z.string().nullish(),
  originalPartnerReferenceNo: z.string().nullish(),
  latestTransactionStatus: z.string().min(1),
  transactionStatusDesc: z.string().nullish(),
  paidTime: z.string().nullish(),
  amount: z.object({ value: z.union([z.string(), z.number()]), currency: z.string().optional() }).nullish(),
});

type SnapResponseType = { responseCode?: string; responseMessage?: string };

type GenerateQrisRequestType = {
  partnerReferenceNo: string;
  merchantId: string;
  amount: { value: string; currency: "IDR" };
  validityPeriod: string;
};

type GenerateQrisResponseType = z.infer<typeof generateQrisResponseSchema>;

type QueryQrisResponseType = z.infer<typeof queryQrisResponseSchema>;

/**
 * HTTP client BatPay Open API (SNAP).
 * Alur: ambil access token B2B (RSA) -> panggil API transaksi dengan signature HMAC-SHA512.
 */
export default class BatpayApiHelper extends Helper {
  // Cache access token per proses (berlaku ±15 menit), supaya tidak meminta token di setiap request.
  private static cachedToken: { value: string; expiresAt: number } | null = null;

  constructor() {
    super(batpayConfig.baseUrl);
  }

  async generateQris(body: GenerateQrisRequestType): Promise<GenerateQrisResponseType> {
    const data = await this.post(GENERATE_QRIS_PATH, body);
    const result = generateQrisResponseSchema.safeParse(data);
    if (!result.success) throw this.providerError("Unexpected generate QRIS response", data);
    return result.data;
  }

  /**
   * Status transaksi QRIS ("Check Status Payment"). latestTransactionStatus: 00 Success, 01 Initiated, 02 Paying,
   * 03 Pending, 04 Refunded, 05 Canceled, 06 Failed, 07 Not found. Cadangan webhook: selama merchant sandbox dipakai
   * bersama kesan-invitation, callback BatPay terdaftar ke server kesan-invitation.
   */
  async queryQris(partnerReferenceNo: string, referenceNo: string | null): Promise<QueryQrisResponseType> {
    const data = await this.post(QUERY_QRIS_PATH, {
      originalPartnerReferenceNo: partnerReferenceNo,
      ...(referenceNo ? { originalReferenceNo: referenceNo } : {}),
      serviceCode: QRIS_MPM_SERVICE_CODE,
      additionalInfo: {},
    });
    const result = queryQrisResponseSchema.safeParse(data);
    if (!result.success) throw this.providerError("Unexpected query QRIS response", data);
    return result.data;
  }

  // Batalkan QRIS yang belum dibayar ("Payment QRIS Cancellation"), supaya QR pesanan yang dibatalkan tidak bisa dibayar.
  async cancelQris(input: { partnerReferenceNo: string; referenceNo: string | null; amount: string; reason: string }): Promise<void> {
    await this.post(CANCEL_QRIS_PATH, {
      originalPartnerReferenceNo: input.partnerReferenceNo,
      ...(input.referenceNo ? { originalReferenceNo: input.referenceNo } : {}),
      merchantId: batpayConfig.merchantId,
      reason: input.reason.slice(0, 255),
      amount: { value: input.amount, currency: "IDR" },
      additionalInfo: {},
    });
  }

  // POST transaksi bertanda tangan. Jika token ditolak (401), token di-refresh lalu dicoba sekali lagi.
  private async post(path: string, body: object, retryOnUnauthorized = true): Promise<unknown> {
    const accessToken = await this.getAccessToken();
    const timestamp = toSnapTimestamp();
    // Body yang di-hash harus sama persis dengan yang dikirim (base helper juga memakai JSON.stringify).
    const signature = signHmacSha512(
      transactionStringToSign({ method: "POST", path, accessToken, rawBody: JSON.stringify(body), timestamp }),
      batpayConfig.secretKey
    );

    try {
      const { data } = await this.request<SnapResponseType>(path, {
        method: "POST",
        body,
        timeoutMs: batpayConfig.timeoutMs,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-TIMESTAMP": timestamp,
          "X-SIGNATURE": signature,
          "X-PARTNER-ID": batpayConfig.partnerId,
          "X-EXTERNAL-ID": snapExternalId(),
          "CHANNEL-ID": batpayConfig.channelId,
        },
      });
      if (!data?.responseCode?.startsWith("200")) throw this.providerError(`${path} rejected`, data);
      return data;
    } catch (error) {
      if (retryOnUnauthorized && error instanceof HttpException && error.status === 401) {
        BatpayApiHelper.cachedToken = null;
        return await this.post(path, body, false);
      }
      throw this.toProviderError(path, error);
    }
  }

  private async getAccessToken(): Promise<string> {
    const cached = BatpayApiHelper.cachedToken;
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const timestamp = toSnapTimestamp();
    const signature = signRsaSha256(accessTokenStringToSign(batpayConfig.clientKey, timestamp), batpayPrivateKey());

    try {
      const { data } = await this.request(ACCESS_TOKEN_PATH, {
        method: "POST",
        body: { grantType: "client_credentials" },
        timeoutMs: batpayConfig.timeoutMs,
        headers: { "X-CLIENT-KEY": batpayConfig.clientKey, "X-TIMESTAMP": timestamp, "X-SIGNATURE": signature },
      });

      const result = accessTokenResponseSchema.safeParse(data);
      if (!result.success) throw this.providerError("Unexpected access token response", data);

      BatpayApiHelper.cachedToken = { value: result.data.accessToken, expiresAt: Date.now() + result.data.expiresIn * 1000 - TOKEN_REFRESH_MARGIN_MS };
      return result.data.accessToken;
    } catch (error) {
      throw this.toProviderError(ACCESS_TOKEN_PATH, error);
    }
  }

  private toProviderError(path: string, error: unknown): PaymentProviderException {
    if (error instanceof PaymentProviderException) return error;
    const detail = error instanceof HttpException ? error.additionalInfo : (error as Error)?.message;
    return this.providerError(`${path} failed`, detail);
  }

  // Detail respons BatPay hanya ditulis ke log; client cukup menerima pesan umum.
  private providerError(message: string, detail: unknown): PaymentProviderException {
    logger.error({ detail }, `[batpay] ${message}`);
    return new PaymentProviderException();
  }
}

export type { GenerateQrisRequestType, GenerateQrisResponseType, QueryQrisResponseType };
