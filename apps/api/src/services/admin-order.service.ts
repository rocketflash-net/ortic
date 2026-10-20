import Service from "@base/service.base";
import { isProduction } from "@config/app.config";
import { db } from "@config/database.config";
import { biteshipConfig } from "@config/order.config";
import { logger } from "@config/logger.config";
import OrderDto from "@dto/order.dto";
import { AuditActionEnum } from "@enums/audit.enum";
import OrderEventTypeEnum from "@enums/order-event-type.enum";
import OrderStatusEnum, { OrderStatusType } from "@enums/order-status.enum";
import PermissionEnum from "@enums/permission.enum";
import RefundStatusEnum from "@enums/refund-status.enum";
import StockMovementTypeEnum from "@enums/stock-movement-type.enum";
import BadRequestException from "@exceptions/bad-request.exception";
import NotFoundException from "@exceptions/not-found.exception";
import { PICKED_UP_STATUSES } from "@helpers/biteship/biteship-status.helper";
import { hasPermission } from "@registries/role-permission.registry";
import OrderEventRepository from "@repositories/order-event.repository";
import OrderRepository, { AdminOrderFilterType } from "@repositories/order.repository";
import UserRepository from "@repositories/user.repository";
import WarehouseRepository from "@repositories/warehouse.repository";
import AuditLogService from "@services/audit-log.service";
import OrderMailService from "@services/order-mail.service";
import OrderService from "@services/order.service";
import ShipmentService from "@services/shipment.service";
import StockService from "@services/stock.service";
import { AuditActorType } from "@@types/audit.type";
import { AuthUserType } from "@@types/auth.type";
import { OrderType } from "@@types/entity.type";
import ResponseType from "@@types/response.type";
import { endOfWibDay, startOfWibDay } from "@utils/date.util";
import { buildPaginationMeta, toPaginationOptions } from "@utils/pagination.util";
import { ListAdminOrderQueryType, MarkRefundedInputType, RejectOrderInputType } from "@validators/admin-order.validator";

// Pesanan yang bisa diterima admin (AUTO_ACCEPT_ORDERS=false, atau pesanan yang perlu dicek).
const ACCEPTABLE: OrderStatusType[] = [OrderStatusEnum.awaiting_confirmation, OrderStatusEnum.needs_action];
// Pesanan yang bisa ditolak: belum dijemput kurir.
const REJECTABLE: OrderStatusType[] = [
  OrderStatusEnum.awaiting_payment,
  OrderStatusEnum.awaiting_confirmation,
  OrderStatusEnum.processing,
  OrderStatusEnum.awaiting_pickup,
  OrderStatusEnum.needs_action,
];

/**
 * Pesanan di dashboard admin: daftar & detail, Terima/Tolak, refund manual, booking kurir ulang, simulasi pengiriman.
 * Staf yang dikaitkan ke satu gudang hanya melihat pesanan gudang itu.
 */
export default class AdminOrderService extends Service {
  constructor(
    private readonly orderRepository: OrderRepository = new OrderRepository(),
    private readonly eventRepository: OrderEventRepository = new OrderEventRepository(),
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly warehouseRepository: WarehouseRepository = new WarehouseRepository(),
    private readonly stockService: StockService = new StockService(),
    private readonly shipmentService: ShipmentService = new ShipmentService(),
    private readonly auditLogService: AuditLogService = new AuditLogService(),
    private readonly orderMail: OrderMailService = new OrderMailService(),
    private readonly orderService: OrderService = new OrderService()
  ) {
    super();
  }

  async list(query: ListAdminOrderQueryType, user: AuthUserType): Promise<ResponseType> {
    const filter: AdminOrderFilterType = {
      statuses: query.status,
      warehouseId: user.warehouseId ?? query.warehouse_id,
      refundStatus: query.refund_status,
      from: query.date_from ? startOfWibDay(query.date_from) : undefined,
      to: query.date_to ? endOfWibDay(query.date_to) : undefined,
      search: query.search,
    };
    // Status pembayaran disamakan dulu (sama seperti tampilan pembeli), supaya daftar & jumlah per status tidak tertinggal.
    await this.orderService.refreshAwaitingPayment(filter.warehouseId);
    const [rows, total, counts] = await Promise.all([
      this.orderRepository.findAdmin(filter, toPaginationOptions(query)),
      this.orderRepository.countAdmin(filter),
      this.orderRepository.countByStatus({ warehouseId: filter.warehouseId, from: filter.from, to: filter.to, search: filter.search }),
    ]);
    const items = await this.orderRepository.findItems(rows.map((row) => row.id));
    return this.success(
      rows.map((row) =>
        OrderDto.adminListItem(
          row,
          items.filter((item) => item.orderId === row.id)
        )
      ),
      "Success",
      undefined,
      { pagination: buildPaginationMeta(query, total), status_counts: counts }
    );
  }

  async show(code: string, user: AuthUserType): Promise<ResponseType> {
    const order = await this.orderService.refreshUnpaid(await this.findOrFail(code, user));
    return this.success(await this.detail(order, user));
  }

  // Terima pesanan lunas -> Diproses -> booking kurir.
  async accept(code: string, user: AuthUserType, actor: AuditActorType): Promise<ResponseType> {
    const order = await this.findOrFail(code, user);
    if (!order.paidAt) throw new BadRequestException("Only paid orders can be accepted");
    if (!ACCEPTABLE.includes(order.status)) throw new BadRequestException("This order cannot be accepted in its current status");

    const changed = await this.orderRepository.transaction(async (tx) => {
      const changed = await this.orderRepository
        .withTransaction(tx)
        .transition(order.id, [order.status], { status: OrderStatusEnum.processing, acceptedAt: new Date() });
      if (!changed) return false;
      await this.eventRepository.withTransaction(tx).store({
        orderId: order.id,
        type: OrderEventTypeEnum.status,
        status: OrderStatusEnum.processing,
        title: "Pesanan diproses",
        description: "Pesanan diterima toko dan disiapkan untuk pengiriman",
        actorUserId: user.id,
        occurredAt: new Date(),
      });
      await this.auditLogService.record(tx, actor, {
        action: AuditActionEnum.order_accepted,
        targetType: "order",
        targetId: order.code,
        metadata: { before: { status: order.status }, after: { status: OrderStatusEnum.processing } },
      });
      return true;
    });
    if (!changed) throw new BadRequestException("The order status has changed, reload and try again");

    await this.shipmentService.book(order.id, user.id);
    return this.success(await this.detail((await this.orderRepository.findById(order.id))!, user), "Order accepted");
  }

  /**
   * Tolak pesanan sebelum dijemput kurir: booking dibatalkan, stok kembali, dan pesanan yang sudah dibayar ditandai
   * "refund tertunda" (Owner mentransfer manual lalu klik "Tandai sudah direfund").
   */
  async reject(code: string, input: RejectOrderInputType, user: AuthUserType, actor: AuditActorType): Promise<ResponseType> {
    const order = await this.findOrFail(code, user);
    if (!REJECTABLE.includes(order.status)) throw new BadRequestException("This order can no longer be rejected");
    if (order.shippingStatus && PICKED_UP_STATUSES.includes(order.shippingStatus))
      throw new BadRequestException("The parcel has already been picked up by the courier");

    if (order.biteshipOrderId) await this.shipmentService.cancelBooking(order, input.reason);

    const now = new Date();
    const paid = order.paidAt !== null;
    const changed = await this.orderRepository.transaction(async (tx) => {
      const changed = await this.orderRepository.withTransaction(tx).transition(order.id, [order.status], {
        status: OrderStatusEnum.rejected,
        rejectedAt: now,
        rejectReason: input.reason,
        refundStatus: paid ? RefundStatusEnum.pending : RefundStatusEnum.none,
        refundAmount: paid ? order.total : null,
      });
      if (!changed) return false;
      await this.eventRepository.withTransaction(tx).store({
        orderId: order.id,
        type: OrderEventTypeEnum.status,
        status: OrderStatusEnum.rejected,
        title: "Pesanan ditolak toko",
        description: input.reason,
        actorUserId: user.id,
        occurredAt: now,
      });
      await this.auditLogService.record(tx, actor, {
        action: AuditActionEnum.order_rejected,
        targetType: "order",
        targetId: order.code,
        metadata: { before: { status: order.status }, after: { status: OrderStatusEnum.rejected }, reason: input.reason, refund_pending: paid },
      });
      return true;
    });
    if (!changed) throw new BadRequestException("The order status has changed, reload and try again");

    const rejected = (await this.orderRepository.findById(order.id))!;
    await this.stockService.returnOrder(rejected, StockMovementTypeEnum.sale_release, user.id);
    if (paid) void this.orderMail.toBuyer("rejected", rejected).catch((error) => logger.error({ err: error }, "[admin-order] reject email failed"));
    return this.success(await this.detail(rejected, user), "Order rejected");
  }

  async markRefunded(code: string, input: MarkRefundedInputType, user: AuthUserType, actor: AuditActorType): Promise<ResponseType> {
    const order = await this.findOrFail(code, user);
    if (order.refundStatus !== RefundStatusEnum.pending) throw new BadRequestException("This order has no pending refund");

    const amount = input.amount ?? order.refundAmount ?? order.total;
    await this.orderRepository.transaction(async (tx) => {
      await this.orderRepository
        .withTransaction(tx)
        .update(order.id, { refundStatus: RefundStatusEnum.refunded, refundAmount: amount, refundedAt: new Date(), refundNote: input.note });
      await this.eventRepository.withTransaction(tx).store({
        orderId: order.id,
        type: OrderEventTypeEnum.status,
        status: "refunded",
        title: "Refund selesai",
        description: `Rp${amount.toLocaleString("id-ID")}${input.note ? ` · ${input.note}` : ""}`,
        actorUserId: user.id,
        occurredAt: new Date(),
      });
      await this.auditLogService.record(tx, actor, {
        action: AuditActionEnum.order_refunded,
        targetType: "order",
        targetId: order.code,
        metadata: { amount, note: input.note },
      });
    });
    const refunded = (await this.orderRepository.findById(order.id))!;
    void this.orderMail.toBuyer("refunded", refunded).catch((error) => logger.error({ err: error }, "[admin-order] refund email failed"));
    return this.success(await this.detail(refunded, user), "Refund recorded");
  }

  async bookShipment(code: string, user: AuthUserType, actor: AuditActorType): Promise<ResponseType> {
    const order = await this.findOrFail(code, user);
    const booked = await this.shipmentService.rebook(order, user.id);
    await this.auditLogService.record(db, actor, {
      action: AuditActionEnum.order_shipment_booked,
      targetType: "order",
      targetId: order.code,
      metadata: { biteship_order_id: booked.biteshipOrderId, waybill_id: booked.waybillId },
    });
    return this.success(await this.detail(booked, user), "Courier booked");
  }

  async simulateShipping(code: string, user: AuthUserType): Promise<ResponseType> {
    const order = await this.findOrFail(code, user);
    const updated = await this.shipmentService.simulateNext(order);
    return this.success(await this.detail(updated, user), "Shipping status simulated");
  }

  private async detail(order: OrderType, user: AuthUserType) {
    const [items, events, buyer, warehouse] = await Promise.all([
      this.orderRepository.findItems([order.id]),
      this.eventRepository.findByOrder(order.id),
      this.userRepository.findById(order.userId),
      this.warehouseRepository.findById(order.warehouseId),
    ]);
    const canManage = hasPermission(user, PermissionEnum.orders_manage);
    const pickedUp = order.shippingStatus !== null && PICKED_UP_STATUSES.includes(order.shippingStatus);
    return OrderDto.adminDetail(order, items, events, {
      buyer,
      warehouse,
      canSeeCost: hasPermission(user, PermissionEnum.prices_manage),
      can: {
        accept: canManage && order.paidAt !== null && ACCEPTABLE.includes(order.status),
        reject: canManage && REJECTABLE.includes(order.status) && !pickedUp,
        book_shipment: canManage && order.status === OrderStatusEnum.processing && !order.biteshipOrderId,
        mark_refunded: canManage && order.refundStatus === RefundStatusEnum.pending,
        simulate_shipping:
          canManage &&
          !isProduction() &&
          biteshipConfig.mockOrders &&
          order.biteshipOrderId !== null &&
          ([OrderStatusEnum.processing, OrderStatusEnum.awaiting_pickup, OrderStatusEnum.shipped] as OrderStatusType[]).includes(order.status),
      },
    });
  }

  private async findOrFail(code: string, user: AuthUserType): Promise<OrderType> {
    const order = await this.orderRepository.findByCode(code);
    if (!order || (user.warehouseId && order.warehouseId !== user.warehouseId)) throw new NotFoundException("Order not found");
    return order;
  }
}
