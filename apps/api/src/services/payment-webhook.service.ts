import Service from "@base/service.base";
import { logger } from "@config/logger.config";
import NotFoundException from "@exceptions/not-found.exception";
import PaymentGatewayInterface from "@interfaces/payment-gateway.interface";
import OrderService from "@services/order.service";
import { PaymentWebhookInputType } from "@@types/payment.type";
import ResponseType from "@@types/response.type";

/**
 * Webhook dari payment gateway: verifikasi signature/token lalu terapkan ke pesanan lewat OrderService.applyPayment.
 * Idempoten: notifikasi ganda untuk pesanan yang sudah lunas tidak memberi efek apa pun.
 * Gateway di-inject per route webhook (tiap provider punya endpoint & format notifikasi sendiri).
 */
export default class PaymentWebhookService extends Service {
  constructor(
    private readonly paymentGateway: PaymentGatewayInterface,
    private readonly orderService: OrderService = new OrderService()
  ) {
    super();
  }

  async handle(input: PaymentWebhookInputType): Promise<ResponseType> {
    // Throw 401 jika signature/token tidak valid.
    const notification = await this.paymentGateway.parseWebhook(input);
    logger.info(
      { provider: this.paymentGateway.name, providerRef: notification.providerRef, status: notification.status, amount: notification.amount },
      "[payment] webhook received"
    );

    const order = await this.orderService.findByProviderRef(this.paymentGateway.name, notification.providerRef);
    if (!order) throw new NotFoundException("Order not found");
    const updated = await this.orderService.applyPayment(order, notification);
    return this.success({ code: updated.code, status: updated.status }, "Payment processed");
  }
}
