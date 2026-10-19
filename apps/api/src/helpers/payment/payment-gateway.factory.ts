import { isProduction } from "@config/app.config";
import { assertBatpayConfigured } from "@config/batpay.config";
import { paymentConfig } from "@config/payment.config";
import BatpayPaymentGateway from "@helpers/payment/batpay-payment.gateway";
import MockPaymentGateway from "@helpers/payment/mock-payment.gateway";
import PaymentGatewayInterface from "@interfaces/payment-gateway.interface";

// Daftar provider QRIS. Menambah provider: buat class yang implements PaymentGatewayInterface
// di folder ini, daftarkan di sini, tambahkan route webhook-nya, lalu set PAYMENT_PROVIDER di .env.
const PROVIDERS: Record<string, () => PaymentGatewayInterface> = {
  mock: () => new MockPaymentGateway(),
  batpay: () => {
    assertBatpayConfigured();
    return new BatpayPaymentGateway();
  },
};

// Provider aktif untuk membuat QRIS order baru.
const createPaymentGateway = (provider: string = paymentConfig.provider): PaymentGatewayInterface => {
  if (provider === "mock" && isProduction()) {
    throw new Error("PAYMENT_PROVIDER=mock is not allowed in production");
  }

  const factory = PROVIDERS[provider];
  if (!factory) throw new Error(`Unknown PAYMENT_PROVIDER "${provider}"`);
  return factory();
};

export { createPaymentGateway };
