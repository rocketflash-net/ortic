import type { Category } from "@/features/home/models"

export enum CatalogPageName {
  PRODUCTS = "CatalogProducts",
  CATEGORY = "CatalogCategory",
  PRODUCT = "CatalogProduct",
}

export const CATALOG_SORTS = ["newest", "price_asc", "price_desc", "name"] as const
export type CatalogSort = (typeof CATALOG_SORTS)[number]

/** Product card from `GET /catalog/products`. Prices are of the variants on sale. */
export type CatalogProduct = {
  id: number
  name: string
  slug: string
  brand_name: string | null
  category: { name: string; slug: string }
  image_url: string | null
  price_min: number
  price_max: number
  /** Highest struck-through price, only when above the lowest price. */
  compare_at_price: number | null
  variant_count: number
  /** At least one variant has stock in a warehouse that ships. */
  in_stock: boolean
}

export type CatalogProductParams = {
  page: number
  limit: number
  search?: string
  /** Category slug. */
  category?: string
  sort: CatalogSort
}

export type CatalogProductListInfo = {
  pagination: { page: number; limit: number; total: number; totalPages: number }
  category: Category | null
}

export type CatalogVariant = {
  id: number
  sku: string
  name: string | null
  price: number
  compare_at_price: number | null
  weight_gram: number
  /** Most units one warehouse can ship (0 = out of stock). */
  stock: number
}

/** `GET /catalog/products/{slug}`. */
export type CatalogProductDetail = {
  id: number
  name: string
  slug: string
  brand_name: string | null
  category: { name: string; slug: string }
  /** Sanitized HTML from the API, safe for v-html. */
  description_html: string | null
  specifications: Record<string, string> | null
  permit_number: string | null
  is_hazardous: boolean
  images: { url: string }[]
  variants: CatalogVariant[]
  in_stock: boolean
  /** Running promo; `ends_at` null = no end date. */
  sale: { ends_at: string | null } | null
}
