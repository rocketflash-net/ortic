/**
 * Shipping estimate: `POST /admin/shipping/rates`. Quotes active couriers from one warehouse to a Biteship
 * area. While `additionalInfo.is_mock` is true the prices are fake (Biteship balance not topped up yet).
 */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type { ShippingRate, ShippingRateQuotePayload } from "../models"

export const quoteShippingRates = async (payload: ShippingRateQuotePayload): Promise<BackendResponse<ShippingRate[]>> => {
  const configRequest: CustomAxiosRequestConfig<ShippingRateQuotePayload> = { url: "/admin/shipping/rates", method: "POST", data: payload }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
