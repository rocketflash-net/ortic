import type { OrderStatusType } from "@ortic/shared"

import type { PaginationRequest } from "@/shared/models/api"

export enum OrdersPageName {
  ORDERS = "Orders",
  ORDER_DETAIL = "OrderDetail",
  ORDER_LABEL = "OrderLabel",
}

/** Every order status, in the order shown in the status filter. */
export const ORDER_STATUS_FILTERS = [
  "awaiting_confirmation",
  "needs_action",
  "processing",
  "awaiting_pickup",
  "shipped",
  "completed",
  "awaiting_payment",
  "cancelled",
  "rejected",
  "returned",
] as const satisfies readonly OrderStatusType[]

/** Badge colour per status. */
export const ORDER_STATUS_COLOR: Record<OrderStatusType, "primary" | "secondary" | "success" | "info" | "warning" | "error" | "neutral"> = {
  awaiting_payment: "neutral",
  paid: "info",
  awaiting_confirmation: "warning",
  processing: "info",
  awaiting_pickup: "info",
  shipped: "primary",
  completed: "success",
  cancelled: "neutral",
  rejected: "error",
  returned: "warning",
  needs_action: "error",
}

export type RefundStatus = "none" | "pending" | "refunded"

/** Row of `GET /admin/orders`. Dates are ISO strings. */
export type AdminOrderListItem = {
  code: string
  status: OrderStatusType
  created_at: string
  paid_at: string | null
  buyer: { name: string; email: string }
  recipient_name: string
  city: string
  warehouse_id: number
  courier: string
  waybill_id: string | null
  shipping_status: string | null
  /** Last courier booking error while the order is still not booked. */
  shipment_error: string | null
  item_count: number
  total: number
  refund_status: RefundStatus
}

/** `additionalInfo` of `GET /admin/orders`. */
export type AdminOrderListInfo = {
  pagination: { page: number; limit: number; total: number; totalPages: number }
  /** Orders per status for the current filters (without the status filter). */
  status_counts: Partial<Record<OrderStatusType, number>>
}

export type AdminOrderListParams = PaginationRequest & {
  /** Comma-separated statuses. */
  status?: string
  warehouse_id?: number
  refund_status?: RefundStatus
  date_from?: string
  date_to?: string
}

export type OrderItem = {
  product_name: string
  product_slug: string
  variant_name: string | null
  sku: string
  image_url: string | null
  price: number
  quantity: number
  subtotal: number
}

export type OrderEvent = {
  /** status | tracking | note */
  type: string
  status: string | null
  title: string
  description: string | null
  occurred_at: string
  is_public: boolean
  actor_name: string | null
}

/** `GET /admin/orders/{code}`. */
export type AdminOrderDetail = {
  id: number
  code: string
  status: OrderStatusType
  created_at: string
  buyer: { id: number; name: string; email: string; phone: string | null; profession: string | null }
  warehouse: { id: number; code: string; name: string; city: string } | null
  recipient: { name: string; phone: string; address: string; district: string; city: string; province: string; postal_code: string; notes: string | null }
  courier: { code: string; name: string; service_code: string; service_name: string; duration: string | null }
  weight_gram: number
  insured_value: number
  items: OrderItem[]
  items_total: number
  shipping_fee: number
  insurance_fee: number
  service_fee: number
  total: number
  payment: {
    provider: string
    qr_string: string | null
    expires_at: string
    paid_at: string | null
    provider_ref: string | null
    provider_transaction_id: string | null
    mdr_amount: number
  }
  shipment: {
    waybill_id: string | null
    status: string | null
    courier_link: string | null
    driver_name: string | null
    driver_phone: string | null
    pickup_scheduled_at: string | null
    shipped_at: string | null
    delivered_at: string | null
    biteship_order_id: string | null
    tracking_id: string | null
    booked_at: string | null
    attempts: number
    error: string | null
    tracked_at: string | null
  }
  accepted_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  rejected_at: string | null
  reject_reason: string | null
  refund: { status: RefundStatus; amount: number | null; refunded_at: string | null; note: string | null }
  completed_at: string | null
  /** Sum of base prices; null for Staff or when an item has no base price. */
  cost_total: number | null
  events: OrderEvent[]
  can: { accept: boolean; reject: boolean; book_shipment: boolean; mark_refunded: boolean; simulate_shipping: boolean }
}

/** Indonesian labels for raw Biteship shipment statuses (same as the API's biteship-status.helper). */
export const SHIPPING_STATUS_LABELS: Record<string, string> = {
  confirmed: "Kurir dibooking",
  scheduled: "Pickup dijadwalkan",
  allocated: "Kurir ditugaskan",
  picking_up: "Kurir menuju gudang",
  picked: "Paket dijemput kurir",
  in_transit: "Paket dalam perjalanan",
  dropping_off: "Paket diantar ke penerima",
  on_hold: "Pengiriman tertahan",
  delivered: "Paket diterima",
  rejected: "Paket ditolak",
  courier_not_found: "Kurir tidak ditemukan",
  return_in_transit: "Paket dikembalikan ke gudang",
  returned: "Paket kembali ke gudang",
  cancelled: "Pengiriman dibatalkan",
  disposed: "Paket dimusnahkan",
}

export const shippingStatusLabel = (status: string | null): string => (status ? (SHIPPING_STATUS_LABELS[status] ?? status) : "-")
