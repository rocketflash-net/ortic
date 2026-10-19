import Service from "@base/service.base";
import { isProduction } from "@config/app.config";
import { logger } from "@config/logger.config";
import { orderConfig } from "@config/order.config";
import OrderDto from "@dto/order.dto";
import OrderStatusEnum from "@enums/order-status.enum";
import BadRequestException from "@exceptions/bad-request.exception";
import NotFoundException from "@exceptions/not-found.exception";
import { createPaymentGateway } from "@helpers/payment/payment-gateway.factory";
import OrderRepository from "@repositories/order.repository";
import { OrderType } from "@@types/entity.type";
import { PaginationQueryType } from "@@types/pagination.type";
import { PaymentNotificationType } from "@@types/payment.type";
import ResponseType from "@@types/response.type";
import { buildPaginationMeta, toPaginationOptions } from "@utils/pagination.util";

// Halaman bayar polling tiap 3 detik; status ke provider ditanyakan paling sering sekali per interval ini per order.
const QUERY_INTERVAL_MS = 5000;
// Order baru dibatalkan sedikit setelah QR kedaluwarsa, supaya pembayaran di detik terakhir masih tercatat.
const EXPIRY_GRACE_MS = 2 * 60 * 1000;

/**
 * Pesanan pembeli dan status pembayarannya. Notifikasi pembayaran (webhook provider, polling halaman bayar, job
 * kedaluwarsa, simulasi mock) semuanya masuk lewat `applyPayment`, jadi hasilnya sama apa pun jalurnya.
 */
export default class OrderService extends Service {
  private static lastQueriedAt = new Map<number, number>();

  constructor(private readonly orderRepository: OrderRepository = new OrderRepository()) {
    super();
  }

  async list(userId: number, pagination: PaginationQueryType): Promise<ResponseType> {
    const [orders, total] = await Promise.all([this.orderRepository.findByUser(userId, toPaginationOptions(pagination)), this.orderRepository.countByUser(userId)]);
    const items = await this.orderRepository.findItems(orders.map((order) => order.id));
    return this.success(
      orders.map((order) => OrderDto.summary(order, items.filter((item) => item.orderId === order.id))),
      "Success",
      undefined,
      { pagination: buildPaginationMeta(pagination, total) }
    );
  }

  // Detail pesanan. Selama menunggu pembayaran, status ditanyakan ke provider (cadangan bila webhook tidak sampai).
  async show(userId: number, code: string): Promise<ResponseType> {
    let order = await this.findOwnedOrFail(userId, code);
    if (order.status === OrderStatusEnum.awaiting_payment) order = await this.syncPayment(order);
    return this.success(OrderDto.detail(order, await this.orderRepository.findItems([order.id])));
  }

  async cancel(userId: number, code: string): Promise<ResponseType> {
    let order = await this.findOwnedOrFail(userId, code);
    // Cek dulu ke provider: jangan batalkan pesanan yang ternyata baru saja dibayar.
    if (order.status === OrderStatusEnum.awaiting_payment) order = await this.syncPayment(order, true);
    if (order.status !== OrderStatusEnum.awaiting_payment) throw new BadRequestException("Only unpaid orders can be cancelled");

    const changed = await this.orderRepository.transition(order.id, [OrderStatusEnum.awaiting_payment], {
      status: OrderStatusEnum.cancelled,
      cancelledAt: new Date(),
      cancelReason: "Dibatalkan pembeli",
    });
    if (changed) await this.cancelQris(order, "Cancelled by buyer");
    return this.success(OrderDto.detail((await this.orderRepository.findById(order.id))!, await this.orderRepository.findItems([order.id])), "Order cancelled");
  }

  // Development (provider mock): tandai lunas tanpa membayar.
  async simulatePayment(userId: number, code: string): Promise<ResponseType> {
    const order = await this.findOwnedOrFail(userId, code);
    if (isProduction() || order.paymentProvider !== "mock") throw new BadRequestException("Payment simulation is only available for the mock provider");
    await this.applyPayment(order, { providerRef: order.providerRef ?? "", amount: order.total, status: "paid" });
    return this.success(OrderDto.detail((await this.orderRepository.findById(order.id))!, await this.orderRepository.findItems([order.id])), "Payment simulated");
  }

  /**
   * Terapkan status pembayaran. Lunas -> processing (AUTO_ACCEPT_ORDERS=true) atau awaiting_confirmation (false).
   * Pembayaran yang datang setelah order dibatalkan karena kedaluwarsa tetap diterima (uang sudah masuk).
   * Idempoten: notifikasi ganda tidak berefek.
   */
  async applyPayment(order: OrderType, notification: PaymentNotificationType): Promise<OrderType> {
    if (notification.status === "pending") return order;

    if (notification.status === "failed") {
      const changed = await this.orderRepository.transition(order.id, [OrderStatusEnum.awaiting_payment], {
        status: OrderStatusEnum.cancelled,
        cancelledAt: new Date(),
        cancelReason: "Pembayaran gagal atau dibatalkan",
      });
      if (changed) logger.info({ orderId: order.id, code: order.code }, "[order] payment failed");
      return (await this.orderRepository.findById(order.id))!;
    }

    // amount 0 = provider tidak menyebut nominal (mis. respons query tanpa amount).
    const amountMismatch = notification.amount > 0 && Math.round(notification.amount) !== order.total;
    const status = amountMismatch ? OrderStatusEnum.needs_action : orderConfig.autoAccept ? OrderStatusEnum.processing : OrderStatusEnum.awaiting_confirmation;
    const changed = await this.orderRepository.transition(order.id, [OrderStatusEnum.awaiting_payment, OrderStatusEnum.cancelled], {
      status,
      paidAt: new Date(),
      cancelledAt: null,
      cancelReason: null,
    });
    if (changed) {
      const log = { orderId: order.id, code: order.code, total: order.total, paid: notification.amount, status };
      if (amountMismatch) logger.error(log, "[order] paid amount does not match the order");
      else logger.info(log, "[order] paid");
    }
    return (await this.orderRepository.findById(order.id))!;
  }

  /**
   * Job berkala: order yang QR-nya kedaluwarsa dicek sekali lagi ke provider, lalu dibatalkan bila memang belum dibayar.
   * Mengembalikan jumlah order yang dibatalkan.
   */
  async expireUnpaid(now: Date = new Date()): Promise<number> {
    const expired = await this.orderRepository.findExpiredUnpaid(new Date(now.getTime() - EXPIRY_GRACE_MS));
    let cancelled = 0;
    for (const order of expired) {
      const synced = await this.syncPayment(order, true);
      if (synced.status !== OrderStatusEnum.awaiting_payment) continue;
      const changed = await this.orderRepository.transition(order.id, [OrderStatusEnum.awaiting_payment], {
        status: OrderStatusEnum.cancelled,
        cancelledAt: now,
        cancelReason: "QRIS kedaluwarsa",
      });
      if (changed) {
        cancelled += 1;
        await this.cancelQris(order, "QRIS expired");
      }
    }
    return cancelled;
  }

  async findByProviderRef(provider: string, providerRef: string): Promise<OrderType | null> {
    return await this.orderRepository.findByProviderRef(provider, providerRef);
  }

  // Tanya status ke provider order ini (dibatasi QUERY_INTERVAL_MS kecuali `force`). Gagal bertanya = status tetap.
  private async syncPayment(order: OrderType, force = false): Promise<OrderType> {
    if (!order.providerRef) return order;
    const last = OrderService.lastQueriedAt.get(order.id) ?? 0;
    if (!force && Date.now() - last < QUERY_INTERVAL_MS) return order;
    OrderService.lastQueriedAt.set(order.id, Date.now());

    try {
      const notification = await createPaymentGateway(order.paymentProvider).queryStatus({
        providerRef: order.providerRef,
        providerTransactionId: order.providerTransactionId,
      });
      return notification ? await this.applyPayment(order, notification) : order;
    } catch (error) {
      logger.warn({ err: error, orderId: order.id }, "[order] payment status query failed");
      return order;
    }
  }

  // Matikan QR di sisi provider. Gagal tidak membatalkan apa pun: QR tetap kedaluwarsa sendiri, dan pembayaran yang
  // terlanjur masuk tetap diterima lewat applyPayment.
  private async cancelQris(order: OrderType, reason: string): Promise<void> {
    if (!order.providerRef) return;
    try {
      await createPaymentGateway(order.paymentProvider).cancelQris({
        providerRef: order.providerRef,
        providerTransactionId: order.providerTransactionId,
        amount: order.total,
        reason,
      });
    } catch (error) {
      logger.warn({ err: error, orderId: order.id }, "[order] provider QRIS cancellation failed");
    }
  }

  private async findOwnedOrFail(userId: number, code: string): Promise<OrderType> {
    const order = await this.orderRepository.findOwnedByCode(userId, code);
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }
}
