/**
 * Admin products API: list, detail, save (info + photos + variants at once), status, photo upload, brands.
 */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type {
  Brand,
  Category,
  PricingDefaults,
  ProductDetail,
  ProductImageUpload,
  ProductListInfo,
  ProductListItem,
  ProductListParams,
  ProductPayload,
  ProductStatus,
} from "../models"

export type ProductListResponse = BackendResponse<ProductListItem[]> & { additionalInfo: ProductListInfo }

/** TanStack Query keys for the products feature. */
export const productQueryKeys = {
  all: ["products"] as const,
  list: (params: ProductListParams) => [...productQueryKeys.all, "list", params] as const,
  detail: (id: number) => [...productQueryKeys.all, "detail", id] as const,
  pricingDefaults: ["products", "pricing-defaults"] as const,
  brands: ["brands"] as const,
  categories: ["categories"] as const,
}

export const getProducts = async (params: ProductListParams): Promise<ProductListResponse> => {
  const configRequest: CustomAxiosRequestConfig = {
    url: "/admin/products",
    method: "GET",
    params: { page: params.page, limit: params.limit, search: params.search || undefined, category_id: params.category_id, status: params.status },
  }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const getProduct = async (id: number): Promise<BackendResponse<ProductDetail>> => {
  const configRequest: CustomAxiosRequestConfig = { url: `/admin/products/${id}`, method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const createProduct = async (payload: ProductPayload): Promise<BackendResponse<ProductDetail>> => {
  const configRequest: CustomAxiosRequestConfig<ProductPayload> = { url: "/admin/products", method: "POST", data: payload }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const updateProduct = async (id: number, payload: ProductPayload): Promise<BackendResponse<ProductDetail>> => {
  const configRequest: CustomAxiosRequestConfig<ProductPayload> = { url: `/admin/products/${id}`, method: "PUT", data: payload }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const updateProductStatus = async (id: number, status: ProductStatus): Promise<BackendResponse<ProductDetail>> => {
  const configRequest: CustomAxiosRequestConfig<{ status: ProductStatus }> = { url: `/admin/products/${id}/status`, method: "PATCH", data: { status } }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const getPricingDefaults = async (): Promise<BackendResponse<PricingDefaults>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/admin/products/pricing-defaults", method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const getBrands = async (): Promise<BackendResponse<Brand[]>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/admin/brands", method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const createBrand = async (name: string): Promise<BackendResponse<Brand>> => {
  const configRequest: CustomAxiosRequestConfig<{ name: string }> = { url: "/admin/brands", method: "POST", data: { name } }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const getCategories = async (): Promise<BackendResponse<Category[]>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/catalog/categories", method: "GET", meta: { requiresAuth: false } }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

/**
 * Uploads one product photo through the presigned flow and returns its storage key and public URL.
 *
 * @remarks
 * The PUT goes straight to storage (or the API's local storage in development) with plain fetch, so the storage
 * host never receives the API auth header.
 */
export const uploadProductImage = async (file: File): Promise<{ storage_key: string; url: string }> => {
  const presign: CustomAxiosRequestConfig<{ content_type: string; size: number }> = {
    url: "/admin/products/images/presign",
    method: "POST",
    data: { content_type: file.type, size: file.size },
  }
  const { data } = await axiosInstance.request<BackendResponse<ProductImageUpload>>(presign)
  const upload = data.data!
  const response = await fetch(upload.upload_url, { method: upload.method, headers: upload.headers, body: file })
  if (!response.ok) throw new Error(`Upload failed (${response.status})`)
  return { storage_key: upload.key, url: upload.public_url }
}
