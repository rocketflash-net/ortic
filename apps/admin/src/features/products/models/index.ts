export enum ProductsPageName {
  PRODUCTS = "Products",
  PRODUCT_CREATE = "ProductCreate",
  PRODUCT_EDIT = "ProductEdit",
}

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

/** Row of `GET /admin/products`. Prices are Rupiah of active variants. */
export type ProductListItem = {
  id: number
  name: string
  slug: string
  status: ProductStatus
  category: { id: number; name: string }
  brand_name: string | null
  image_url: string | null
  variant_count: number
  price_min: number | null
  price_max: number | null
  updated_at: string
}

export type ProductListParams = {
  page: number
  limit: number
  /** Product name or variant SKU. */
  search?: string
  category_id?: number
  status?: ProductStatus
}

export type ProductListInfo = {
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

/**
 * Variant from the product detail.
 *
 * @remarks
 * `base_price` and `markup_percent` are only sent to users with `prices:manage` (Owner).
 */
export type ProductVariant = {
  id: number
  sku: string
  name: string | null
  base_price?: number
  markup_percent?: number | null
  price: number
  price_locked: boolean
  compare_at_price: number | null
  /** Promo price during the product's sale period. */
  sale_price: number | null
  weight_gram: number
  length_cm: number | null
  width_cm: number | null
  height_cm: number | null
  is_active: boolean
}

export type ProductImage = { id: number; storage_key: string; url: string }

/** `GET /admin/products/{id}`. `markup_percent` is only present for the Owner. */
export type ProductDetail = {
  id: number
  name: string
  slug: string
  category_id: number
  brand_id: number | null
  /** Sanitized HTML (older products may still hold plain text). */
  description: string | null
  specifications: Record<string, string> | null
  permit_number: string | null
  is_hazardous: boolean
  markup_percent?: number | null
  /** Sale period of the variants' `sale_price` (ISO). Null = open-ended on that side. */
  sale_starts_at: string | null
  sale_ends_at: string | null
  status: ProductStatus
  images: ProductImage[]
  variants: ProductVariant[]
  created_at: string
  updated_at: string
}

/** Variant in `POST /admin/products` and `PUT /admin/products/{id}`. Omit `id` for a new variant. */
export type ProductVariantPayload = {
  id?: number
  sku: string
  name: string | null
  base_price?: number
  markup_percent?: number | null
  price?: number
  price_locked: boolean
  compare_at_price?: number | null
  sale_price?: number | null
  weight_gram: number
  length_cm: number | null
  width_cm: number | null
  height_cm: number | null
  is_active: boolean
}

/** Whole product: the API replaces info, photos, and variants with this. */
export type ProductPayload = {
  name: string
  slug: string
  category_id: number
  brand_id: number | null
  description: string | null
  specifications: Record<string, string> | null
  permit_number: string | null
  is_hazardous: boolean
  markup_percent?: number | null
  /** ISO 8601 with offset, or null. Only applied for the Owner. */
  sale_starts_at: string | null
  sale_ends_at: string | null
  status: ProductStatus
  images: { storage_key: string }[]
  variants: ProductVariantPayload[]
}

/** `GET /admin/products/pricing-defaults` (Owner). */
export type PricingDefaults = { markup_percent: number; price_rounding: number }

export type Brand = { id: number; name: string; slug: string }

/** `POST /admin/products/import` result. Rows are 1-based CSV lines (line 1 = header). */
export type ProductImportResult = {
  rows: number
  products_created: number
  products_updated: number
  variants_created: number
  variants_updated: number
  issues: { row: number; field: string; message: string }[]
  dry_run: boolean
}

/** Active category from `GET /catalog/categories`. */
export type Category = { id: number; parent_id: number | null; name: string; slug: string; color: string | null }

/** Presigned upload from `POST /admin/products/images/presign`. */
export type ProductImageUpload = {
  key: string
  method: "PUT"
  upload_url: string
  headers: Record<string, string>
  public_url: string
  expires_in: number
}
