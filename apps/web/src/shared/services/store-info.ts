/** Store contact & fees (`GET /catalog/store`), set by the Owner in the dashboard. No login needed. */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

export type StoreInfo = {
  store_name: string
  /** Digits, e.g. "6281234567890" or "081234567890"; empty when not set. */
  store_whatsapp: string
  store_email: string
  store_instagram: string
  store_address: string
  service_fee: number
  insurance_required_above: number
}

export const storeInfoQueryKey = ["catalog", "store"] as const

export const getStoreInfo = async (): Promise<BackendResponse<StoreInfo>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/catalog/store", method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
