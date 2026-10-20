import { and, count, desc, eq, gte, inArray, isNotNull, lte, notInArray, SQL, sql } from "drizzle-orm";
import Repository from "@base/repository.base";
import OrderStatusEnum from "@enums/order-status.enum";
import RefundStatusEnum from "@enums/refund-status.enum";
import { orderItems } from "@models/order-item.model";
import { orders } from "@models/order.model";
import { users } from "@models/user.model";

type SalesFilterType = { from: Date; to: Date; warehouseId?: number | null };

type SalesTotalsType = {
  orders: number;
  itemsTotal: number;
  shippingTotal: number;
  insuranceTotal: number;
  serviceFeeTotal: number;
  revenue: number;
  mdrTotal: number;
  costTotal: number;
  unitsSold: number;
  // Baris tanpa harga dasar (pesanan lama) -> laba tidak lengkap.
  itemsWithoutCost: number;
};

// Penjualan = pesanan yang sudah dibayar pada periode itu dan tidak ditolak toko (uangnya dikembalikan).
const EXCLUDED_STATUSES = [OrderStatusEnum.rejected];

// Tanggal WIB dari kolom UTC (koneksi MySQL memakai UTC).
const wibDate = (column: SQL | typeof orders.paidAt) => sql<string>`date_format(convert_tz(${column}, '+00:00', '+07:00'), '%Y-%m-%d')`;

export default class ReportRepository extends Repository {
  async totals(filter: SalesFilterType): Promise<SalesTotalsType> {
    const [orderRow] = await this.executor
      .select({
        orders: count(),
        itemsTotal: sql<number>`coalesce(sum(${orders.itemsTotal}), 0)`,
        shippingTotal: sql<number>`coalesce(sum(${orders.shippingFee}), 0)`,
        insuranceTotal: sql<number>`coalesce(sum(${orders.insuranceFee}), 0)`,
        serviceFeeTotal: sql<number>`coalesce(sum(${orders.serviceFee}), 0)`,
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
        mdrTotal: sql<number>`coalesce(sum(${orders.mdrAmount}), 0)`,
      })
      .from(orders)
      .where(this.salesWhere(filter));
    const [itemRow] = await this.executor
      .select({
        costTotal: sql<number>`coalesce(sum(${orderItems.basePrice} * ${orderItems.quantity}), 0)`,
        unitsSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
        itemsWithoutCost: sql<number>`coalesce(sum(case when ${orderItems.basePrice} is null then 1 else 0 end), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(this.salesWhere(filter));
    return {
      orders: Number(orderRow?.orders ?? 0),
      itemsTotal: Number(orderRow?.itemsTotal ?? 0),
      shippingTotal: Number(orderRow?.shippingTotal ?? 0),
      insuranceTotal: Number(orderRow?.insuranceTotal ?? 0),
      serviceFeeTotal: Number(orderRow?.serviceFeeTotal ?? 0),
      revenue: Number(orderRow?.revenue ?? 0),
      mdrTotal: Number(orderRow?.mdrTotal ?? 0),
      costTotal: Number(itemRow?.costTotal ?? 0),
      unitsSold: Number(itemRow?.unitsSold ?? 0),
      itemsWithoutCost: Number(itemRow?.itemsWithoutCost ?? 0),
    };
  }

  // Penjualan per hari (WIB).
  async daily(filter: SalesFilterType): Promise<{ date: string; orders: number; revenue: number; itemsTotal: number; mdr: number; serviceFee: number }[]> {
    const day = wibDate(orders.paidAt);
    const rows = await this.executor
      .select({
        date: day,
        orders: count(),
        revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
        itemsTotal: sql<number>`coalesce(sum(${orders.itemsTotal}), 0)`,
        mdr: sql<number>`coalesce(sum(${orders.mdrAmount}), 0)`,
        serviceFee: sql<number>`coalesce(sum(${orders.serviceFee}), 0)`,
      })
      .from(orders)
      .where(this.salesWhere(filter))
      .groupBy(day)
      .orderBy(day);
    return rows.map((row) => ({
      date: row.date,
      orders: Number(row.orders),
      revenue: Number(row.revenue),
      itemsTotal: Number(row.itemsTotal),
      mdr: Number(row.mdr),
      serviceFee: Number(row.serviceFee),
    }));
  }

  async dailyCost(filter: SalesFilterType): Promise<Map<string, number>> {
    const day = wibDate(orders.paidAt);
    const rows = await this.executor
      .select({ date: day, cost: sql<number>`coalesce(sum(${orderItems.basePrice} * ${orderItems.quantity}), 0)` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(this.salesWhere(filter))
      .groupBy(day);
    return new Map(rows.map((row) => [row.date, Number(row.cost)]));
  }

  async topProducts(filter: SalesFilterType, limit = 10) {
    const rows = await this.executor
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        quantity: sql<number>`sum(${orderItems.quantity})`,
        revenue: sql<number>`sum(${orderItems.subtotal})`,
        cost: sql<number>`sum(coalesce(${orderItems.basePrice}, 0) * ${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(this.salesWhere(filter))
      .groupBy(orderItems.productId, orderItems.productName)
      .orderBy(desc(sql`sum(${orderItems.subtotal})`))
      .limit(limit);
    return rows.map((row) => ({ ...row, quantity: Number(row.quantity), revenue: Number(row.revenue), cost: Number(row.cost) }));
  }

  async byWarehouse(filter: SalesFilterType) {
    const rows = await this.executor
      .select({ warehouseId: orders.warehouseId, orders: count(), revenue: sql<number>`coalesce(sum(${orders.total}), 0)` })
      .from(orders)
      .where(this.salesWhere(filter))
      .groupBy(orders.warehouseId);
    return rows.map((row) => ({ warehouseId: row.warehouseId, orders: Number(row.orders), revenue: Number(row.revenue) }));
  }

  // Pesanan pada periode (dibuat), per status — termasuk yang belum/tidak dibayar.
  async statusBreakdown(filter: SalesFilterType): Promise<Record<string, number>> {
    const rows = await this.executor
      .select({ status: orders.status, total: count() })
      .from(orders)
      .where(
        and(gte(orders.createdAt, filter.from), lte(orders.createdAt, filter.to), filter.warehouseId ? eq(orders.warehouseId, filter.warehouseId) : undefined)
      )
      .groupBy(orders.status);
    return Object.fromEntries(rows.map((row) => [row.status, row.total]));
  }

  async refunds(filter: SalesFilterType): Promise<{ pending: number; pendingAmount: number; refunded: number; refundedAmount: number }> {
    const [row] = await this.executor
      .select({
        pending: sql<number>`coalesce(sum(case when ${orders.refundStatus} = ${RefundStatusEnum.pending} then 1 else 0 end), 0)`,
        pendingAmount: sql<number>`coalesce(sum(case when ${orders.refundStatus} = ${RefundStatusEnum.pending} then ${orders.refundAmount} else 0 end), 0)`,
        refunded: sql<number>`coalesce(sum(case when ${orders.refundStatus} = ${RefundStatusEnum.refunded} then 1 else 0 end), 0)`,
        refundedAmount: sql<number>`coalesce(sum(case when ${orders.refundStatus} = ${RefundStatusEnum.refunded} then ${orders.refundAmount} else 0 end), 0)`,
      })
      .from(orders)
      .where(
        and(
          isNotNull(orders.paidAt),
          gte(orders.paidAt, filter.from),
          lte(orders.paidAt, filter.to),
          filter.warehouseId ? eq(orders.warehouseId, filter.warehouseId) : undefined
        )
      );
    return {
      pending: Number(row?.pending ?? 0),
      pendingAmount: Number(row?.pendingAmount ?? 0),
      refunded: Number(row?.refunded ?? 0),
      refundedAmount: Number(row?.refundedAmount ?? 0),
    };
  }

  // Baris pesanan untuk ekspor CSV (semua pesanan yang dibuat pada periode).
  async exportRows(filter: SalesFilterType) {
    return await this.executor
      .select({ order: orders, buyerEmail: users.email })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.userId))
      .where(
        and(gte(orders.createdAt, filter.from), lte(orders.createdAt, filter.to), filter.warehouseId ? eq(orders.warehouseId, filter.warehouseId) : undefined)
      )
      .orderBy(orders.createdAt);
  }

  async itemCostByOrder(orderIds: number[]): Promise<Map<number, number | null>> {
    if (orderIds.length === 0) return new Map();
    const rows = await this.executor
      .select({
        orderId: orderItems.orderId,
        cost: sql<number>`sum(coalesce(${orderItems.basePrice}, 0) * ${orderItems.quantity})`,
        missing: sql<number>`sum(case when ${orderItems.basePrice} is null then 1 else 0 end)`,
      })
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds))
      .groupBy(orderItems.orderId);
    return new Map(rows.map((row) => [row.orderId, Number(row.missing) > 0 ? null : Number(row.cost)]));
  }

  // Jumlah pesanan yang menunggu tindakan admin (kartu dashboard).
  async pendingActions(warehouseId?: number | null) {
    const scope = warehouseId ? eq(orders.warehouseId, warehouseId) : undefined;
    const [row] = await this.executor
      .select({
        awaitingConfirmation: sql<number>`coalesce(sum(case when ${orders.status} = ${OrderStatusEnum.awaiting_confirmation} then 1 else 0 end), 0)`,
        needsAction: sql<number>`coalesce(sum(case when ${orders.status} = ${OrderStatusEnum.needs_action} then 1 else 0 end), 0)`,
        bookingFailed: sql<number>`coalesce(sum(case when ${orders.status} = ${OrderStatusEnum.processing} and ${orders.biteshipOrderId} is null and ${orders.shipmentError} is not null then 1 else 0 end), 0)`,
        toShip: sql<number>`coalesce(sum(case when ${orders.status} in (${OrderStatusEnum.processing}, ${OrderStatusEnum.awaiting_pickup}) then 1 else 0 end), 0)`,
        inTransit: sql<number>`coalesce(sum(case when ${orders.status} = ${OrderStatusEnum.shipped} then 1 else 0 end), 0)`,
        refundPending: sql<number>`coalesce(sum(case when ${orders.refundStatus} = ${RefundStatusEnum.pending} then 1 else 0 end), 0)`,
      })
      .from(orders)
      .where(and(notInArray(orders.status, [OrderStatusEnum.awaiting_payment, OrderStatusEnum.cancelled]), scope));
    return {
      awaitingConfirmation: Number(row?.awaitingConfirmation ?? 0),
      needsAction: Number(row?.needsAction ?? 0),
      bookingFailed: Number(row?.bookingFailed ?? 0),
      toShip: Number(row?.toShip ?? 0),
      inTransit: Number(row?.inTransit ?? 0),
      refundPending: Number(row?.refundPending ?? 0),
    };
  }

  private salesWhere({ from, to, warehouseId }: SalesFilterType): SQL | undefined {
    return and(
      isNotNull(orders.paidAt),
      gte(orders.paidAt, from),
      lte(orders.paidAt, to),
      notInArray(orders.status, EXCLUDED_STATUSES),
      warehouseId ? eq(orders.warehouseId, warehouseId) : undefined
    );
  }
}

export { type SalesFilterType, type SalesTotalsType };
