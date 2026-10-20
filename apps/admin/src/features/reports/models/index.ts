export enum ReportsPageName {
  SALES = "SalesReport",
  STOCK = "StockReport",
}

/** Report period, WIB days inclusive (`YYYY-MM-DD`). */
export type ReportParams = { date_from: string; date_to: string; warehouse_id?: number }

/**
 * `GET /admin/reports/sales`. Profit fields (cost, gross profit, margin) are null for users without `prices:manage`.
 * Gross profit = goods - base price + service fee - QRIS MDR; shipping & insurance pass through to Biteship.
 */
export type SalesReport = {
  period: { date_from: string; date_to: string; warehouse_id: number | null }
  totals: {
    orders: number
    units_sold: number
    items_total: number
    shipping_total: number
    insurance_total: number
    service_fee_total: number
    revenue: number
    mdr_total: number
    average_order_value: number
    cost_total: number | null
    gross_profit: number | null
    margin_percent: number | null
    /** Some sold items have no base price recorded (old orders), so profit is understated. */
    profit_incomplete: boolean | null
  }
  daily: { date: string; orders: number; revenue: number; items_total: number; gross_profit: number | null }[]
  top_products: { product_id: number | null; product_name: string; quantity: number; revenue: number; gross_profit: number | null }[]
  by_warehouse: { warehouse_id: number; warehouse_name: string; orders: number; revenue: number }[]
  /** Orders created in the period, per status (including unpaid ones). */
  status_breakdown: Record<string, number>
  refunds: { pending: number; pending_amount: number; refunded: number; refunded_amount: number }
}

/** `GET /admin/reports/stock`. `value` (base price × units) is null without `prices:manage`. */
export type StockReport = {
  warehouses: {
    warehouse_id: number
    warehouse_name: string
    is_active: boolean
    units: number
    sku_in_stock: number
    low_count: number
    out_count: number
    value: number | null
  }[]
  low_stock: StockReportItem[]
  out_of_stock: StockReportItem[]
}

export type StockReportItem = {
  warehouse_id: number
  warehouse_name: string
  variant_id: number
  product_name: string
  variant_name: string | null
  sku: string
  available: number
  low_stock_threshold: number
}
