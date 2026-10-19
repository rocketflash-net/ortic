export enum WarehousesPageName {
  WAREHOUSES = "Warehouses",
}

/** Warehouse from `GET /admin/warehouses`. Dates are ISO strings. */
export type Warehouse = {
  id: number
  code: string
  name: string
  address: string
  province: string
  city: string
  district: string | null
  postal_code: string | null
  biteship_area_id: string | null
  latitude: number | null
  longitude: number | null
  pic_name: string | null
  pic_phone: string | null
  /** Courier pickup time (WIB, HH:mm). */
  pickup_time: string
  is_active: boolean
  /** Active and has a Biteship area, so it can be used for shipping quotes. */
  is_shipping_ready: boolean
  created_at: string
  updated_at: string
}

/** Body of `POST /admin/warehouses` and `PATCH /admin/warehouses/{id}`. */
export type WarehousePayload = Omit<Warehouse, "id" | "is_shipping_ready" | "created_at" | "updated_at">
