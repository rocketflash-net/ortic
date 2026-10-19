import { z } from "zod";
import { paymentConfig } from "@config/payment.config";
import UnauthorizedException from "@exceptions/unauthorized.exception";
import PaymentGatewayInterface from "@interfaces/payment-gateway.interface";
import { CreateQrisInputType, CreateQrisResultType, PaymentNotificationType, PaymentWebhookInputType } from "@@types/payment.type";
import { randomCode, safeEqual } from "@utils/crypto.util";
import { headerValue } from "@utils/request.util";

const webhookBodySchema = z.object({
  provider_ref: z.string().min(1),
  amount: z.number().int(),
  status: z.enum(["paid", "failed"]),
});

/**
 * Provider QRIS palsu untuk development (tidak aktif di production).
 * Simulasikan pembayaran dengan memanggil webhook:
 *
 *   curl -X POST http://localhost:4000/api/v1/webhooks/mock/payments \
 *     -H "content-type: application/json" -H "x-callback-token: $PAYMENT_WEBHOOK_TOKEN" \
 *     -d '{"provider_ref":"MOCK-...","amount":99000,"status":"paid"}'
 */
export default class MockPaymentGateway implements PaymentGatewayInterface {
  readonly name = "mock";

  async createQris(input: CreateQrisInputType): Promise<CreateQrisResultType> {
    const providerRef = `MOCK-${input.orderId}-${randomCode(8)}`;
    return {
      providerRef,
      providerTransactionId: null,
      qrString: `00020101021226-MOCK-QRIS-${providerRef}-AMOUNT-${input.amount}`,
      expiresAt: input.expiresAt,
    };
  }

  async parseWebhook({ headers, body }: PaymentWebhookInputType): Promise<PaymentNotificationType> {
    const token = headerValue(headers, "x-callback-token");
    if (!paymentConfig.webhookToken || !token || !safeEqual(token, paymentConfig.webhookToken)) {
      throw new UnauthorizedException("Invalid webhook token");
    }

    const payload = webhookBodySchema.parse(body);
    return { providerRef: payload.provider_ref, amount: payload.amount, status: payload.status };
  }

  // Provider palsu tidak punya status sendiri; pembayaran disimulasikan lewat webhook mock.
  async queryStatus(): Promise<null> {
    return null;
  }

  async cancelQris(): Promise<void> {}
}
