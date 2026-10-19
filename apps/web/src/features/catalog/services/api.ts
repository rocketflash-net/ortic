/** Public product catalog: `/catalog/products`, no login needed. */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type { CatalogProduct, CatalogProductDetail, CatalogProductListInfo, CatalogProductParams } from "../models"

export type CatalogProductListResponse = BackendResponse<CatalogProduct[]> & { additionalInfo: CatalogProductListInfo }

export const productQueryKeys = {
  all: ["catalog", "products"] as const,
  list: (params: CatalogProductParams) => [...productQueryKeys.all, "list", params] as const,
  detail: (slug: string) => [...productQueryKeys.all, "detail", slug] as const,
}

export const getCatalogProducts = async (params: CatalogProductParams): Promise<CatalogProductListResponse> => {
  const configRequest: CustomAxiosRequestConfig = {
    url: "/catalog/products",
    method: "GET",
    params: { page: params.page, limit: params.limit, search: params.search || undefined, category: params.category || undefined, sort: params.sort },
  }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const getCatalogProduct = async (slug: string): Promise<BackendResponse<CatalogProductDetail>> => {
  const configRequest: CustomAxiosRequestConfig = { url: `/catalog/products/${encodeURIComponent(slug)}`, method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
