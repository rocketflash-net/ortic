/**
 * Admin orders: `/admin/orders`. List & detail, accept/reject, manual refund, courier (re)booking, and the
 * shipping simulator available while the API runs with BITESHIP_MOCK_ORDERS.
 */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type { AdminOrderDetail, AdminOrderListInfo, AdminOrderListItem, AdminOrderListParams } from "../models"

export type AdminOrderListResponse = BackendResponse<AdminOrderListItem[]> & { additionalInfo: AdminOrderListInfo }

/** TanStack Query keys for the orders feature. */
export const orderQueryKeys = {
  all: ["orders"] as const,
  list: (params: AdminOrderListParams) => [...orderQueryKeys.all, "list", params] as const,
  detail: (code: string) => [...orderQueryKeys.all, "detail", code] as const,
}

export const getOrders = async (params: AdminOrderListParams): Promise<AdminOrderListResponse> => {
  const configRequest: CustomAxiosRequestConfig = {
    url: "/admin/orders",
    method: "GET",
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      status: params.status || undefined,
      warehouse_id: params.warehouse_id || undefined,
      refund_status: params.refund_status || undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
    },
  }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const getOrder = async (code: string): Promise<BackendResponse<AdminOrderDetail>> => {
  const configRequest: CustomAxiosRequestConfig = { url: `/admin/orders/${encodeURIComponent(code)}`, method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

const action = async <T = undefined>(code: string, path: string, body?: T): Promise<BackendResponse<AdminOrderDetail>> => {
  const configRequest: CustomAxiosRequestConfig<T> = { url: `/admin/orders/${encodeURIComponent(code)}/${path}`, method: "POST", data: body }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const acceptOrder = (code: string) => action(code, "accept")

export const rejectOrder = (code: string, reason: string) => action(code, "reject", { reason })

export const markOrderRefunded = (code: string, payload: { amount?: number; note: string | null }) => action(code, "refund", payload)

export const bookOrderShipment = (code: string) => action(code, "book-shipment")

export const simulateOrderShipping = (code: string) => action(code, "simulate-shipping")
