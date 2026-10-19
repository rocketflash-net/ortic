/** Public catalog: `/catalog/*`, no login needed. */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type { Category } from "../models"

export const catalogQueryKeys = {
  categories: ["catalog", "categories"] as const,
}

export const getCategories = async (): Promise<BackendResponse<Category[]>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/catalog/categories", method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
