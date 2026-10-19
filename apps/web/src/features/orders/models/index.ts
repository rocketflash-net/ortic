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

/** `GET /orders/{code}`. `payment.qr_string` is only present while the order awaits payment. */
export type Order = {
  code: string
  status: OrderStatusType
  created_at: string
  recipient: { name: string; phone: string; address: string; district: string; city: string; province: string; postal_code: string; notes: string | null }
  courier: { code: string; name: string; service_code: string; service_name: string; duration: string | null }
  weight_gram: number
  items: OrderItem[]
  items_total: number
  shipping_fee: number
  insurance_fee: number
  service_fee: number
  total: number
  payment: { provider: string; qr_string: string | null; expires_at: string; paid_at: string | null }
  cancelled_at: string | null
  cancel_reason: string | null
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
}

export type OrderListInfo = { pagination: { page: number; limit: number; total: number; totalPages: number } }
