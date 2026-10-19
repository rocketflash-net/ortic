export enum ShippingRatesPageName {
  SHIPPING_RATES = "ShippingRates",
}

/** One courier service from `POST /admin/shipping/rates`, sorted cheapest first by the API. */
export type ShippingRate = {
  courier_code: string
  courier_name: string
  service_code: string
  service_name: string
  /** As given by Biteship, e.g. "2 - 3 days" or "1 days". */
  duration: string
  shipping_fee: number
  insurance_fee: number
  /** What the buyer pays for shipping (shipping fee + insurance). */
  price: number
}

/** Body of `POST /admin/shipping/rates`. */
export type ShippingRateQuotePayload = {
  warehouse_id: number
  destination_area_id: string
  weight_gram: number
  /** Item value in Rupiah to insure; 0 = not insured. */
  insured_value: number
}

/** `additionalInfo` of the rates response. */
export type ShippingRateMeta = {
  /** True while the API uses fake Biteship rates (`BITESHIP_MOCK_RATES`). */
  is_mock: boolean
}
