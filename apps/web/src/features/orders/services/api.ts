/** Buyer orders (login required). */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type { Order, OrderListInfo, OrderSummary } from "../models"

export type OrderListResponse = BackendResponse<OrderSummary[]> & { additionalInfo: OrderListInfo }

export const orderQueryKeys = {
  all: ["orders"] as const,
  list: (page: number) => [...orderQueryKeys.all, "list", page] as const,
  detail: (code: string) => [...orderQueryKeys.all, "detail", code] as const,
}

export const getOrders = async (page: number): Promise<OrderListResponse> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/orders", method: "GET", params: { page, limit: 20 } }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

/** While unpaid, the API also checks the payment status with the QRIS provider. */
export const getOrder = async (code: string): Promise<BackendResponse<Order>> => {
  const configRequest: CustomAxiosRequestConfig = { url: `/orders/${encodeURIComponent(code)}`, method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const cancelOrder = async (code: string): Promise<BackendResponse<Order>> => {
  const configRequest: CustomAxiosRequestConfig = { url: `/orders/${encodeURIComponent(code)}/cancel`, method: "POST" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

/** Development only (QRIS provider "mock"): mark the order paid. */
export const simulatePayment = async (code: string): Promise<BackendResponse<Order>> => {
  const configRequest: CustomAxiosRequestConfig = { url: `/orders/${encodeURIComponent(code)}/simulate-payment`, method: "POST" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
