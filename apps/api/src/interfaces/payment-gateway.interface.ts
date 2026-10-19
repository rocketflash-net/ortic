import {
  CreateQrisInputType,
  CreateQrisResultType,
  PaymentCancelInputType,
  PaymentNotificationType,
  PaymentQueryInputType,
  PaymentWebhookInputType,
} from "@@types/payment.type";

/**
 * Kontrak provider QRIS. Provider baru cukup mengimplementasikan interface ini lalu didaftarkan di
 * helpers/payment/payment-gateway.factory.ts — service order & webhook tidak perlu diubah.
 */
export default interface PaymentGatewayInterface {
  // Disimpan di kolom orders.provider.
  readonly name: string;

  createQris(input: CreateQrisInputType): Promise<CreateQrisResultType>;

  // Verifikasi signature/token webhook lalu normalisasi payload. Throw UnauthorizedException jika tidak valid.
  parseWebhook(input: PaymentWebhookInputType): Promise<PaymentNotificationType>;

  // Tanya status pembayaran langsung ke provider (cadangan bila webhook tidak sampai). null = provider tidak mendukung.
  queryStatus(input: PaymentQueryInputType): Promise<PaymentNotificationType | null>;

  // Batalkan QR yang belum dibayar di sisi provider (tidak semua provider mendukung; boleh no-op).
  cancelQris(input: PaymentCancelInputType): Promise<void>;
}
