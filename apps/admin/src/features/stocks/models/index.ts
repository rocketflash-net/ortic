export enum StocksPageName {
  STOCKS = "Stocks",
}

export const STOCK_LEVELS = ["all", "low", "out"] as const
export type StockLevelFilter = (typeof STOCK_LEVELS)[number]

/** Row of `GET /admin/stocks`: one variant in the selected warehouse. */
export type StockLevel = {
  variant_id: number
  product_id: number
  product_name: string
  product_status: string
  variant_name: string | null
  sku: string
  image_url: string | null
  is_active: boolean
  quantity: number
  /** Held by unpaid orders (QRIS still valid). */
  reserved: number
  /** quantity - reserved. */
  available: number
  low_stock_threshold: number
  level: "ok" | "low" | "out"
}

export type StockListParams = {
  page: number
  limit: number
  warehouse_id?: number
  search?: string
  category_id?: number
  level: StockLevelFilter
}

export type StockListInfo = {
  pagination: { page: number; limit: number; total: number; totalPages: number }
  /** Warehouse the list was resolved to (default: Staf's warehouse or first active one). */
  warehouse_id: number
}

export const STOCK_MOVEMENT_TYPES = ["stock_in", "sale", "sale_release", "return", "adjustment", "transfer_in", "transfer_out"] as const
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number]

/** Row of the stock card (`GET /admin/stocks/movements`). Positive quantity = in, negative = out. */
export type StockMovement = {
  id: number
  warehouse_id: number
  warehouse_code: string
  type: StockMovementType
  quantity: number
  reference_type: string | null
  reference_id: string | null
  note: string | null
  actor_name: string | null
  created_at: string
}

/** Stock of one variant after a change. */
export type StockLevelResult = {
  warehouse_id: number
  variant_id: number
  quantity: number
  reserved: number
  available: number
  low_stock_threshold: number
}

/** `stock_in`: quantity received (+). `adjustment`: counted quantity (stock opname). */
export type AdjustStockPayload = {
  warehouse_id: number
  variant_id: number
  type: "stock_in" | "adjustment"
  quantity: number
  note: string | null
}

export type TransferStockPayload = {
  from_warehouse_id: number
  to_warehouse_id: number
  variant_id: number
  quantity: number
  note: string | null
}

export type ThresholdPayload = { warehouse_id: number; variant_id: number; low_stock_threshold: number }
