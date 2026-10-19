import { IncomingHttpHeaders } from "http";

type CreateQrisInputType = {
  orderId: number;
  amount: number;
  expiresAt: Date;
};

type CreateQrisResultType = {
  // Referensi yang dikirim balik provider di webhook; dipakai untuk mencari order (orders.provider_ref).
  providerRef: string;
  // Id transaksi di sistem provider (mis. referenceNo BatPay), untuk rekonsiliasi & komplain.
  providerTransactionId: string | null;
  qrString: string;
  expiresAt: Date;
};

type PaymentWebhookInputType = {
  headers: IncomingHttpHeaders;
  body: unknown;
  // Body mentah persis seperti yang dikirim provider, dibutuhkan untuk verifikasi signature.
  rawBody?: string;
  // Path URL yang dipanggil provider (tanpa query), bagian dari string-to-sign SNAP.
  path: string;
};

// Notifikasi pembayaran yang sudah dinormalisasi dari format masing-masing provider.
// `pending` = status antara (mis. sedang diproses), tidak mengubah apa pun.
type PaymentQueryInputType = {
  providerRef: string;
  providerTransactionId: string | null;
};

type PaymentCancelInputType = PaymentQueryInputType & {
  amount: number;
  reason: string;
};

type PaymentNotificationType = {
  providerRef: string;
  amount: number;
  status: "paid" | "failed" | "pending";
};

export type { CreateQrisInputType, CreateQrisResultType, PaymentWebhookInputType, PaymentQueryInputType, PaymentCancelInputType, PaymentNotificationType };
