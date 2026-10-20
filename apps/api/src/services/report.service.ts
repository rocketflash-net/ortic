import { stringify } from "csv-stringify/sync";
import Service from "@base/service.base";
import PermissionEnum from "@enums/permission.enum";
import { ORDER_STATUS_LABELS } from "@enums/order-status.enum";
import { hasPermission } from "@registries/role-permission.registry";
import ReportRepository, { SalesFilterType } from "@repositories/report.repository";
import StockRepository from "@repositories/stock.repository";
import WarehouseRepository from "@repositories/warehouse.repository";
import { AuthUserType } from "@@types/auth.type";
import ResponseType from "@@types/response.type";
import { addDays, endOfWibDay, startOfWibDay, wibDay } from "@utils/date.util";
import { ReportQueryType } from "@validators/report.validator";

/**
 * Laporan dashboard: penjualan, laba (setelah MDR QRIS), stok, dan ringkasan beranda.
 *
 * Laba kotor = harga barang - harga dasar + biaya layanan - MDR. Ongkir & asuransi diteruskan ke Biteship (bukan
 * pendapatan). Laba & nilai stok hanya untuk yang punya prices:manage (Owner); Staf melihat penjualannya saja.
 */
export default class ReportService extends Service {
  constructor(
    private readonly reportRepository: ReportRepository = new ReportRepository(),
    private readonly stockRepository: StockRepository = new StockRepository(),
    private readonly warehouseRepository: WarehouseRepository = new WarehouseRepository()
  ) {
    super();
  }

  async sales(query: ReportQueryType, user: AuthUserType): Promise<ResponseType> {
    const filter = this.filter(query, user);
    const canSeeProfit = hasPermission(user, PermissionEnum.prices_manage);
    const [totals, daily, dailyCost, top, byWarehouse, statuses, refunds, warehouses] = await Promise.all([
      this.reportRepository.totals(filter),
      this.reportRepository.daily(filter),
      canSeeProfit ? this.reportRepository.dailyCost(filter) : Promise.resolve(new Map<string, number>()),
      this.reportRepository.topProducts(filter),
      this.reportRepository.byWarehouse(filter),
      this.reportRepository.statusBreakdown(filter),
      this.reportRepository.refunds(filter),
      this.warehouseRepository.findAll(),
    ]);
    const warehouseName = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]));
    const grossProfit = totals.itemsTotal - totals.costTotal + totals.serviceFeeTotal - totals.mdrTotal;

    // Semua hari pada periode tampil (hari tanpa penjualan = 0) supaya grafik tidak melompat.
    const byDay = new Map(daily.map((row) => [row.date, row]));
    const days: string[] = [];
    for (let day = query.date_from; day <= query.date_to; day = wibDay(addDays(startOfWibDay(day), 1))) days.push(day);

    return this.success({
      period: { date_from: query.date_from, date_to: query.date_to, warehouse_id: filter.warehouseId ?? null },
      totals: {
        orders: totals.orders,
        units_sold: totals.unitsSold,
        items_total: totals.itemsTotal,
        shipping_total: totals.shippingTotal,
        insurance_total: totals.insuranceTotal,
        service_fee_total: totals.serviceFeeTotal,
        revenue: totals.revenue,
        mdr_total: totals.mdrTotal,
        average_order_value: totals.orders ? Math.round(totals.revenue / totals.orders) : 0,
        cost_total: canSeeProfit ? totals.costTotal : null,
        gross_profit: canSeeProfit ? grossProfit : null,
        margin_percent: canSeeProfit && totals.itemsTotal ? Math.round((grossProfit / totals.itemsTotal) * 1000) / 10 : null,
        profit_incomplete: canSeeProfit ? totals.itemsWithoutCost > 0 : null,
      },
      daily: days.map((date) => {
        const row = byDay.get(date);
        const cost = dailyCost.get(date) ?? 0;
        return {
          date,
          orders: row?.orders ?? 0,
          revenue: row?.revenue ?? 0,
          items_total: row?.itemsTotal ?? 0,
          gross_profit: canSeeProfit ? (row ? row.itemsTotal - cost + row.serviceFee - row.mdr : 0) : null,
        };
      }),
      top_products: top.map((row) => ({
        product_id: row.productId,
        product_name: row.productName,
        quantity: row.quantity,
        revenue: row.revenue,
        gross_profit: canSeeProfit ? row.revenue - row.cost : null,
      })),
      by_warehouse: byWarehouse.map((row) => ({
        warehouse_id: row.warehouseId,
        warehouse_name: warehouseName.get(row.warehouseId) ?? "-",
        orders: row.orders,
        revenue: row.revenue,
      })),
      status_breakdown: statuses,
      refunds: { pending: refunds.pending, pending_amount: refunds.pendingAmount, refunded: refunds.refunded, refunded_amount: refunds.refundedAmount },
    });
  }

  async stock(user: AuthUserType): Promise<ResponseType> {
    const canSeeValue = hasPermission(user, PermissionEnum.prices_manage);
    const [valuation, warehouses] = await Promise.all([this.stockRepository.valuation(), this.warehouseRepository.findAll()]);
    const visible = warehouses.filter((warehouse) => !user.warehouseId || warehouse.id === user.warehouseId);
    const rows = visible.map((warehouse) => {
      const row = valuation.find((item) => item.warehouseId === warehouse.id);
      return {
        warehouse_id: warehouse.id,
        warehouse_name: warehouse.name,
        is_active: warehouse.isActive,
        units: row?.units ?? 0,
        sku_in_stock: row?.skuCount ?? 0,
        low_count: row?.lowCount ?? 0,
        out_count: row?.outCount ?? 0,
        value: canSeeValue ? (row?.value ?? 0) : null,
      };
    });
    const [low, out] = await Promise.all(
      (["low", "out"] as const).map(async (level) => {
        const lists = await Promise.all(
          visible.map(async (warehouse) =>
            (await this.stockRepository.findLevels({ warehouseId: warehouse.id, level }, { limit: 50, offset: 0 }))
              .filter((item) => item.productStatus === "active" && item.variantActive)
              .map((item) => ({
                warehouse_id: warehouse.id,
                warehouse_name: warehouse.name,
                variant_id: item.variantId,
                product_name: item.productName,
                variant_name: item.variantName,
                sku: item.sku,
                available: Math.max(item.quantity - item.reserved, 0),
                low_stock_threshold: item.lowStockThreshold,
              }))
          )
        );
        return lists.flat();
      })
    );
    return this.success({ warehouses: rows, low_stock: low, out_of_stock: out });
  }

  // Ringkasan beranda dashboard: hari ini, 7 hari terakhir, pekerjaan yang menunggu, stok menipis.
  async dashboard(user: AuthUserType): Promise<ResponseType> {
    const today = wibDay(new Date());
    const weekAgo = wibDay(addDays(startOfWibDay(today), -6));
    const canSeeProfit = hasPermission(user, PermissionEnum.prices_manage);
    const scope = user.warehouseId ?? null;
    const todayFilter = { from: startOfWibDay(today), to: endOfWibDay(today), warehouseId: scope };
    const weekFilter = { from: startOfWibDay(weekAgo), to: endOfWibDay(today), warehouseId: scope };
    const [todayTotals, weekTotals, weekDaily, pending, lowStock] = await Promise.all([
      this.reportRepository.totals(todayFilter),
      this.reportRepository.totals(weekFilter),
      this.reportRepository.daily(weekFilter),
      this.reportRepository.pendingActions(scope),
      this.stockRepository.countLow(scope),
    ]);
    const byDay = new Map(weekDaily.map((row) => [row.date, row]));
    const days: string[] = [];
    for (let day = weekAgo; day <= today; day = wibDay(addDays(startOfWibDay(day), 1))) days.push(day);
    const profit = (totals: typeof todayTotals) => (canSeeProfit ? totals.itemsTotal - totals.costTotal + totals.serviceFeeTotal - totals.mdrTotal : null);

    return this.success({
      today: { orders: todayTotals.orders, revenue: todayTotals.revenue, gross_profit: profit(todayTotals) },
      last_7_days: {
        orders: weekTotals.orders,
        revenue: weekTotals.revenue,
        gross_profit: profit(weekTotals),
        daily: days.map((date) => ({ date, orders: byDay.get(date)?.orders ?? 0, revenue: byDay.get(date)?.revenue ?? 0 })),
      },
      pending: {
        awaiting_confirmation: pending.awaitingConfirmation,
        needs_action: pending.needsAction,
        booking_failed: pending.bookingFailed,
        to_ship: pending.toShip,
        in_transit: pending.inTransit,
        refund_pending: pending.refundPending,
      },
      low_stock: lowStock,
    });
  }

  // CSV pesanan pada periode (untuk pembukuan). Kolom harga dasar & laba hanya untuk Owner.
  async exportCsv(query: ReportQueryType, user: AuthUserType): Promise<string> {
    const filter: SalesFilterType = { ...this.filter(query, user) };
    const canSeeProfit = hasPermission(user, PermissionEnum.prices_manage);
    const [rows, warehouses] = await Promise.all([this.reportRepository.exportRows(filter), this.warehouseRepository.findAll()]);
    const costs = canSeeProfit ? await this.reportRepository.itemCostByOrder(rows.map((row) => row.order.id)) : new Map<number, number | null>();
    const warehouseName = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]));
    const wibTime = (date: Date | null) => (date ? new Date(date.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ") : "");

    const header = [
      "Kode",
      "Dibuat (WIB)",
      "Dibayar (WIB)",
      "Status",
      "Gudang",
      "Pembeli",
      "Penerima",
      "Kota",
      "Kurir",
      "Resi",
      "Barang",
      "Ongkir",
      "Asuransi",
      "Biaya layanan",
      "Total",
      "MDR",
      "Refund",
      ...(canSeeProfit ? ["Harga dasar", "Laba kotor"] : []),
    ];
    const records = rows.map(({ order, buyerEmail }) => {
      const cost = costs.get(order.id);
      const counted = order.paidAt && order.status !== "rejected";
      return [
        order.code,
        wibTime(order.createdAt),
        wibTime(order.paidAt),
        ORDER_STATUS_LABELS[order.status] ?? order.status,
        warehouseName.get(order.warehouseId) ?? "",
        buyerEmail,
        order.recipientName,
        order.city,
        `${order.courierName} ${order.courierServiceName}`,
        order.waybillId ?? "",
        order.itemsTotal,
        order.shippingFee,
        order.insuranceFee,
        order.serviceFee,
        order.total,
        order.mdrAmount,
        order.refundStatus === "none" ? "" : `${order.refundStatus} ${order.refundAmount ?? ""}`.trim(),
        ...(canSeeProfit
          ? [cost ?? "", counted && cost !== null && cost !== undefined ? order.itemsTotal - cost + order.serviceFee - order.mdrAmount : ""]
          : []),
      ];
    });
    // BOM supaya Excel membaca UTF-8 dengan benar.
    return "﻿" + stringify([header, ...records]);
  }

  private filter(query: ReportQueryType, user: AuthUserType): SalesFilterType {
    return { from: startOfWibDay(query.date_from), to: endOfWibDay(query.date_to), warehouseId: user.warehouseId ?? query.warehouse_id ?? null };
  }
}
