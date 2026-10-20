export enum SettingsPageName {
  STORE = "StoreSettings",
  CATEGORIES = "Categories",
  COURIERS = "Couriers",
}

/** Store settings (`GET /admin/settings` → `values`). Every key is optional in `PUT /admin/settings`. */
export type StoreSettings = {
  /** Global markup (%). Selling price = base × (1 + markup), rounded up to `price_rounding`. */
  markup_percent: number
  price_rounding: number
  /** Service fee per parcel (Rp). */
  service_fee: number
  /** Packaging weight added to product weight for shipping quotes (gram). */
  packaging_weight_gram: number
  /** Insurance becomes mandatory at this goods value (Rp). */
  insurance_required_above: number
  /** Warn when the Biteship balance drops below this (Rp). */
  biteship_low_balance: number
  store_name: string
  store_whatsapp: string
  store_email: string
  store_instagram: string
  store_address: string
  /** Emails that receive new-order notifications; empty = every Owner. */
  order_notification_emails: string[]
}

/** Server configuration (from `.env`), read-only in the dashboard. */
export type ServerSettings = {
  auto_accept_orders: boolean
  payment_provider: string
  qris_mdr_rate: number
  qris_mdr_free_max: number
  biteship_mock_rates: boolean
  biteship_mock_orders: boolean
  biteship_webhook_configured: boolean
  is_production: boolean
}

export type SettingsResponse = { values: StoreSettings; server: ServerSettings; repriced_variants?: number }

/** Price changes that a markup/rounding change would cause (pricing preview). */
export type PricingPreview = {
  affected_variants: number
  increased: number
  decreased: number
  samples: { variant_id: number; product_id: number; product_name: string; variant_name: string | null; sku: string; before: number; after: number }[]
}

export const CATEGORY_COLORS = ["red", "yellow", "blue"] as const
export type CategoryColor = (typeof CATEGORY_COLORS)[number]

/** Row of `GET /admin/categories`. `markup_percent` is only sent to the Owner. */
export type AdminCategory = {
  id: number
  name: string
  slug: string
  color: CategoryColor | null
  sort_order: number
  is_active: boolean
  markup_percent?: number | null
  product_count: number
}

export type CategoryPayload = Partial<{
  name: string
  color: CategoryColor | null
  sort_order: number
  is_active: boolean
  markup_percent: number | null
}>

export type CourierService = { code: string; name: string; description: string }

/** Courier from `GET /admin/couriers`. `services` null = every service from Biteship. */
export type Courier = {
  id: number
  code: string
  name: string
  services: string[] | null
  is_active: boolean
  sort_order: number
  available_services: CourierService[]
}

export type CourierPayload = Partial<{ is_active: boolean; services: string[] | null; sort_order: number }>
