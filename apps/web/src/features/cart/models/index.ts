export enum CartPageName {
  CART = "Cart",
}

/** Line of `GET /cart`: price and stock re-read from the database. */
export type ServerCartLine = {
  variant_id: number
  product_id: number | null
  product_name: string
  product_slug: string | null
  variant_name: string | null
  sku: string | null
  image_url: string | null
  price: number
  compare_at_price: number | null
  weight_gram: number
  quantity: number
  /** Most units one warehouse can ship. */
  max_quantity: number
  is_available: boolean
}
