export enum CheckoutPageName {
  CHECKOUT = "Checkout",
}

/** Saved shipping address (`/me/addresses`). */
export type Address = {
  id: number
  label: string | null
  recipient_name: string
  phone: string
  address: string
  province: string
  city: string
  district: string
  postal_code: string
  biteship_area_id: string
  notes: string | null
  is_default: boolean
}

export type AddressPayload = Omit<Address, "id">

/** Biteship area from `GET /shipping/areas?q=` (district + postal code). */
export type ShippingArea = {
  id: string
  label: string
  province: string
  city: string
  district: string
  postal_code: string
}

export type CheckoutItemInput = { variant_id: number; quantity: number }

export type ShippingOption = {
  courier_code: string
  courier_name: string
  service_code: string
  service_name: string
  /** "2 - 3 days" from Biteship. */
  duration: string
  shipping_fee: number
  insurance_fee: number
  /** Shipping + insurance. */
  price: number
}

/** `POST /checkout/quote`: cart re-priced by the API, plus shipping options from the origin warehouse. */
export type CheckoutQuote = {
  address: Address
  /** Warehouse that ships the order (has stock for every item, cheapest shipping). */
  origin: { id: number; name: string; city: string }
  items: {
    variant_id: number
    product_name: string
    product_slug: string
    variant_name: string | null
    image_url: string | null
    price: number
    quantity: number
    subtotal: number
  }[]
  items_total: number
  weight_gram: number
  service_fee: number
  insured_value: number
  insurance_required: boolean
  /** Insurance is mandatory from this items total (Rupiah). */
  insurance_threshold: number
  options: ShippingOption[]
  /** Shipping prices are simulated (Biteship balance not topped up yet). */
  is_mock_rates: boolean
}

export type CheckoutPayload = {
  address_id: number
  items: CheckoutItemInput[]
  insure: boolean
  /** `origin.id` from the quote, so the chosen courier stays valid. */
  warehouse_id?: number
  courier_code: string
  service_code: string
}
