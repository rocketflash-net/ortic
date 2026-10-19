import { and, count, desc, eq, inArray, lt } from "drizzle-orm";
import Repository from "@base/repository.base";
import OrderStatusEnum, { OrderStatusType } from "@enums/order-status.enum";
import { orderItems } from "@models/order-item.model";
import { orders } from "@models/order.model";
import { NewOrderItemType, NewOrderType, OrderItemType, OrderType } from "@@types/entity.type";
import { PaginationOptionsType } from "@@types/pagination.type";

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
    return await this.executor.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt), desc(orders.id)).limit(limit).offset(offset);
  }

  async countByUser(userId: number): Promise<number> {
    const [row] = await this.executor.select({ total: count() }).from(orders).where(eq(orders.userId, userId));
    return row?.total ?? 0;
  }

  async findItems(orderIds: number[]): Promise<OrderItemType[]> {
    if (orderIds.length === 0) return [];
    return await this.executor.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)).orderBy(orderItems.id);
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
