/**
 * Biteship area search: `GET /shipping/areas?q=`. Biteship bills every call, so callers debounce it
 * and only search from 3 characters.
 */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"
import type { ShippingArea } from "@/shared/models/shipping"

export const shippingAreaQueryKeys = {
  search: (query: string) => ["shipping-areas", query] as const,
}

export const searchShippingAreas = async (query: string): Promise<BackendResponse<ShippingArea[]>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/shipping/areas", method: "GET", params: { q: query } }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
