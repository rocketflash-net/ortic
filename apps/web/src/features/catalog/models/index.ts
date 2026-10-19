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
}

/** `GET /catalog/products/{slug}`. */
export type CatalogProductDetail = {
  id: number
  name: string
  slug: string
  brand_name: string | null
  category: { name: string; slug: string }
  description: string | null
  specifications: Record<string, string> | null
  permit_number: string | null
  is_hazardous: boolean
  images: { url: string }[]
  variants: CatalogVariant[]
}
