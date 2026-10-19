import { env, envNumber } from "@config/env.config";

const paymentConfig = {
  // Provider QRIS aktif. Lihat helpers/payment/payment-gateway.factory.ts untuk daftar provider.
  provider: env("PAYMENT_PROVIDER", "mock"),
  // Masa berlaku QR sebelum order dianggap kedaluwarsa.
  orderTtlMinutes: envNumber("PAYMENT_ORDER_TTL_MINUTES", 15),
  // Token rahasia yang dikirim provider di header webhook.
  webhookToken: env("PAYMENT_WEBHOOK_TOKEN"),
};

export { paymentConfig };
