/**
 * Stock per warehouse: `/admin/stocks`. Available to sell = quantity - reserved (unpaid orders). Every change is
 * written to the stock card and the audit log by the API. Staf assigned to one warehouse only manage that one.
 */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type {
  AdjustStockPayload,
  StockLevel,
  StockLevelResult,
  StockListInfo,
  StockListParams,
  StockMovement,
  ThresholdPayload,
  TransferStockPayload,
} from "../models"

export type StockListResponse = BackendResponse<StockLevel[]> & { additionalInfo: StockListInfo }
export type StockMovementResponse = BackendResponse<StockMovement[]> & { additionalInfo: { pagination: StockListInfo["pagination"] } }

export const stockQueryKeys = {
  all: ["stocks"] as const,
  list: (params: StockListParams) => [...stockQueryKeys.all, "list", params] as const,
  movements: (variantId: number, warehouseId: number | undefined, page: number) => [...stockQueryKeys.all, "movements", variantId, warehouseId, page] as const,
}

export const getStocks = async (params: StockListParams): Promise<StockListResponse> => {
  const configRequest: CustomAxiosRequestConfig = {
    url: "/admin/stocks",
    method: "GET",
    params: {
      page: params.page,
      limit: params.limit,
      warehouse_id: params.warehouse_id,
      search: params.search || undefined,
      category_id: params.category_id,
      level: params.level,
    },
  }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const getStockMovements = async (variantId: number, warehouseId: number | undefined, page: number, limit = 20): Promise<StockMovementResponse> => {
  const configRequest: CustomAxiosRequestConfig = {
    url: "/admin/stocks/movements",
    method: "GET",
    params: { variant_id: variantId, warehouse_id: warehouseId, page, limit },
  }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const adjustStock = async (payload: AdjustStockPayload): Promise<BackendResponse<StockLevelResult>> => {
  const configRequest: CustomAxiosRequestConfig<AdjustStockPayload> = { url: "/admin/stocks/adjust", method: "POST", data: payload }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const transferStock = async (payload: TransferStockPayload): Promise<BackendResponse<StockLevelResult>> => {
  const configRequest: CustomAxiosRequestConfig<TransferStockPayload> = { url: "/admin/stocks/transfer", method: "POST", data: payload }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const updateStockThreshold = async (payload: ThresholdPayload): Promise<BackendResponse<StockLevelResult>> => {
  const configRequest: CustomAxiosRequestConfig<ThresholdPayload> = { url: "/admin/stocks/threshold", method: "PATCH", data: payload }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
