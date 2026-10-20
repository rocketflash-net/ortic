export enum DashboardPageName {
  DASHBOARD = "Dashboard",
}

/** `GET /admin/dashboard`. Profit fields are null for users without `prices:manage` (Staff). */
export type DashboardSummary = {
  today: { orders: number; revenue: number; gross_profit: number | null }
  last_7_days: {
    orders: number
    revenue: number
    gross_profit: number | null
    /** One row per WIB day (YYYY-MM-DD), oldest first. */
    daily: { date: string; orders: number; revenue: number }[]
  }
  pending: {
    awaiting_confirmation: number
    needs_action: number
    booking_failed: number
    /** Processing + awaiting pickup. */
    to_ship: number
    in_transit: number
    refund_pending: number
  }
  /** Active variants at or below their low-stock threshold, in any warehouse. */
  low_stock: number
}
