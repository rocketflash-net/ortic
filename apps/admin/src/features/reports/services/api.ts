/**
 * Reports (`reports:read`): sales with profit after QRIS MDR (Owner only), stock levels and value, and the order CSV
 * export for bookkeeping.
 */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type { ReportParams, SalesReport, StockReport } from "../models"

export const reportQueryKeys = {
  all: ["reports"] as const,
  sales: (params: ReportParams) => [...reportQueryKeys.all, "sales", params] as const,
  stock: ["reports", "stock"] as const,
}

export const getSalesReport = async (params: ReportParams): Promise<BackendResponse<SalesReport>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/admin/reports/sales", method: "GET", params }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const getStockReport = async (): Promise<BackendResponse<StockReport>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/admin/reports/stock", method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

/** Orders of the period as CSV (UTF-8 with BOM, opens correctly in Excel). */
export const downloadOrdersCsv = async (params: ReportParams): Promise<Blob> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/admin/reports/orders.csv", method: "GET", params, responseType: "blob" }
  const { data } = await axiosInstance.request<Blob>(configRequest)
  return data
}
