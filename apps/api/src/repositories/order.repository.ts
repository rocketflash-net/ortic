import { and, count, desc, eq, gte, inArray, isNotNull, isNull, like, lt, lte, or, SQL } from "drizzle-orm";
import Repository from "@base/repository.base";
import OrderStatusEnum, { OrderStatusType } from "@enums/order-status.enum";
import { OrderStockStateType } from "@enums/order-stock-state.enum";
import { RefundStatusType } from "@enums/refund-status.enum";
import { orderItems } from "@models/order-item.model";
import { orders } from "@models/order.model";
import { users } from "@models/user.model";
import { NewOrderItemType, NewOrderType, OrderItemType, OrderType } from "@@types/entity.type";
import { PaginationOptionsType } from "@@types/pagination.type";

type AdminOrderFilterType = {
  statuses?: OrderStatusType[];
  warehouseId?: number | null;
  refundStatus?: RefundStatusType;
  // Rentang tanggal pesanan dibuat (UTC, sudah dikonversi dari hari WIB).
  from?: Date;
  to?: Date;
  search?: string;
};

type AdminOrderRowType = OrderType & { buyerEmail: string; buyerName: string };

export default class OrderRepository extends Repository {
  async store(data: NewOrderType): Promise<number> {
    const [result] = await this.executor.insert(orders).values(data).$returningId();
    return result!.id;
  }

  async storeItems(items: NewOrderItemType[]): Promise<void> {
    if (items.length) await this.executor.insert(orderItems).values(items);
  }

  async update(id: number, data: Partial<NewOrderType>): Promise<void> {
    await this.executor.update(orders).set(data).where(eq(orders.id, id));
  }

  /**
   * Ubah order hanya jika statusnya masih salah satu dari `from` (compare-and-set), supaya webhook, polling, dan job
   * kedaluwarsa yang berjalan bersamaan tidak saling menimpa. Mengembalikan true bila baris berubah.
   */
  async transition(id: number, from: OrderStatusType[], data: Partial<NewOrderType>): Promise<boolean> {
    const [result] = await this.executor
      .update(orders)
      .set(data)
      .where(and(eq(orders.id, id), inArray(orders.status, from)));
    return result.affectedRows > 0;
  }

  // Compare-and-set orders.stock_state: true bila berubah (pemanggil lalu mengubah stok), false bila sudah ditangani.
  async transitionStock(id: number, from: OrderStockStateType[], to: OrderStockStateType): Promise<boolean> {
    const [result] = await this.executor
      .update(orders)
      .set({ stockState: to })
      .where(and(eq(orders.id, id), inArray(orders.stockState, from)));
    return result.affectedRows > 0;
  }

  async findById(id: number): Promise<OrderType | null> {
    const [order] = await this.executor.select().from(orders).where(eq(orders.id, id)).limit(1);
    return order ?? null;
  }

  async findByIdForUpdate(id: number): Promise<OrderType | null> {
    const [order] = await this.executor.select().from(orders).where(eq(orders.id, id)).limit(1).for("update");
    return order ?? null;
  }

  async findOwnedByCode(userId: number, code: string): Promise<OrderType | null> {
    const [order] = await this.executor
      .select()
      .from(orders)
      .where(and(eq(orders.code, code), eq(orders.userId, userId)))
      .limit(1);
    return order ?? null;
  }

  async findByProviderRef(provider: string, providerRef: string): Promise<OrderType | null> {
    const [order] = await this.executor
      .select()
      .from(orders)
      .where(and(eq(orders.paymentProvider, provider), eq(orders.providerRef, providerRef)))
      .limit(1);
    return order ?? null;
  }

  async codeExists(code: string): Promise<boolean> {
    const [row] = await this.executor.select({ id: orders.id }).from(orders).where(eq(orders.code, code)).limit(1);
    return Boolean(row);
  }

  async findByUser(userId: number, { limit, offset }: PaginationOptionsType): Promise<OrderType[]> {
    return await this.executor
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(limit)
      .offset(offset);
  }

  async countByUser(userId: number): Promise<number> {
    const [row] = await this.executor.select({ total: count() }).from(orders).where(eq(orders.userId, userId));
    return row?.total ?? 0;
  }

  async findItems(orderIds: number[]): Promise<OrderItemType[]> {
    if (orderIds.length === 0) return [];
    return await this.executor.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)).orderBy(orderItems.id);
  }

  async findByCode(code: string): Promise<OrderType | null> {
    const [order] = await this.executor.select().from(orders).where(eq(orders.code, code)).limit(1);
    return order ?? null;
  }

  async findByBiteshipOrderId(biteshipOrderId: string): Promise<OrderType | null> {
    const [order] = await this.executor.select().from(orders).where(eq(orders.biteshipOrderId, biteshipOrderId)).limit(1);
    return order ?? null;
  }

  // ----- Dashboard admin -----

  async findAdmin(filter: AdminOrderFilterType, { limit, offset }: PaginationOptionsType): Promise<AdminOrderRowType[]> {
    const rows = await this.executor
      .select({ order: orders, buyerEmail: users.email, buyerName: users.name })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.userId))
      .where(this.adminWhere(filter))
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(limit)
      .offset(offset);
    return rows.map((row) => ({ ...row.order, buyerEmail: row.buyerEmail, buyerName: row.buyerName }));
  }

  async countAdmin(filter: AdminOrderFilterType): Promise<number> {
    const [row] = await this.executor.select({ total: count() }).from(orders).innerJoin(users, eq(users.id, orders.userId)).where(this.adminWhere(filter));
    return row?.total ?? 0;
  }

  // Jumlah pesanan per status (badge tab di dashboard), dengan filter selain status.
  async countByStatus(filter: Omit<AdminOrderFilterType, "statuses">): Promise<Record<string, number>> {
    const rows = await this.executor
      .select({ status: orders.status, total: count() })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.userId))
      .where(this.adminWhere(filter))
      .groupBy(orders.status);
    return Object.fromEntries(rows.map((row) => [row.status, row.total]));
  }

  // Pesanan Diproses yang belum berhasil dibooking ke Biteship.
  async findPendingBookings(maxAttempts: number, limit = 20): Promise<OrderType[]> {
    return await this.executor
      .select()
      .from(orders)
      .where(and(eq(orders.status, OrderStatusEnum.processing), isNull(orders.biteshipOrderId), lt(orders.shipmentAttempts, maxAttempts)))
      .orderBy(orders.paidAt)
      .limit(limit);
  }

  // Pesanan dalam pengiriman yang terakhir dicek sebelum `before` (rekonsiliasi berkala).
  async findForTracking(statuses: OrderStatusType[], before: Date, limit = 50): Promise<OrderType[]> {
    return await this.executor
      .select()
      .from(orders)
      .where(and(inArray(orders.status, statuses), isNotNull(orders.biteshipOrderId), or(isNull(orders.trackedAt), lt(orders.trackedAt, before))))
      .orderBy(orders.trackedAt)
      .limit(limit);
  }

  private adminWhere({ statuses, warehouseId, refundStatus, from, to, search }: AdminOrderFilterType): SQL | undefined {
    const conditions: (SQL | undefined)[] = [];
    if (refundStatus) conditions.push(eq(orders.refundStatus, refundStatus));
    if (statuses?.length) conditions.push(inArray(orders.status, statuses));
    if (warehouseId) conditions.push(eq(orders.warehouseId, warehouseId));
    if (from) conditions.push(gte(orders.createdAt, from));
    if (to) conditions.push(lte(orders.createdAt, to));
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          like(orders.code, pattern),
          like(orders.recipientName, pattern),
          like(orders.recipientPhone, pattern),
          like(orders.waybillId, pattern),
          like(users.email, pattern)
        )
      );
    }
    return and(...conditions);
  }

  // Order belum dibayar yang QR-nya sudah lewat `before`.
  async findExpiredUnpaid(before: Date, limit = 100): Promise<OrderType[]> {
    return await this.executor
      .select()
      .from(orders)
      .where(and(eq(orders.status, OrderStatusEnum.awaiting_payment), lt(orders.expiresAt, before)))
      .limit(limit);
  }
}

export { type AdminOrderFilterType, type AdminOrderRowType };
