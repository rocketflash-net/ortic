import type { OrderStatusType } from "@ortic/shared"

export enum OrdersPageName {
  ORDERS = "Orders",
  ORDER = "Order",
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

/** One line of the order history (status changes and courier updates). */
export type OrderEvent = {
  type: "status" | "tracking" | "note"
  status: string | null
  title: string
  description: string | null
  occurred_at: string
}

export type OrderShipment = {
  waybill_id: string | null
  /** Raw Biteship status (confirmed, allocated, picked, ..., delivered). */
  status: string | null
  courier_link: string | null
  driver_name: string | null
  driver_phone: string | null
  pickup_scheduled_at: string | null
  shipped_at: string | null
  delivered_at: string | null
}

/** `GET /orders/{code}`. `payment.qr_string` is only present while the order awaits payment. */
export type Order = {
  code: string
  status: OrderStatusType
  created_at: string
  recipient: {
    name: string
    phone: string
    address: string
    district: string
    city: string
    province: string
    postal_code: string
    notes: string | null
  }
  courier: {
    code: string
    name: string
    service_code: string
    service_name: string
    duration: string | null
  }
  weight_gram: number
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
  }
  shipment: OrderShipment
  cancelled_at: string | null
  cancel_reason: string | null
  rejected_at: string | null
  reject_reason: string | null
  refund: {
    status: "none" | "pending" | "refunded"
    amount: number | null
    refunded_at: string | null
    note: string | null
  }
  completed_at: string | null
  events: OrderEvent[]
}

/** Row of `GET /orders`. */
export type OrderSummary = {
  code: string
  status: OrderStatusType
  created_at: string
  total: number
  item_count: number
  first_item: { product_name: string; image_url: string | null } | null
  expires_at: string
  waybill_id: string | null
}

export type OrderListInfo = {
  pagination: { page: number; limit: number; total: number; totalPages: number }
}
