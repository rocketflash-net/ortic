/** Biteship area from `GET /shipping/areas?q=` (district level), used for warehouse and destination addresses. */
export type ShippingArea = {
  id: string
  /** e.g. "Rumbai, Pekanbaru, Riau. 28261" */
  label: string
  province: string
  city: string
  district: string
  postal_code: string
}
