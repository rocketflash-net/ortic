/**
 * Warehouse settings: `/admin/warehouses`. Everyone in the admin panel can read them; only the Owner
 * (`warehouses:manage`) can add or change one. Every change is audited by the API.
 */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type { Warehouse, WarehousePayload } from "../models"

export const warehouseQueryKeys = {
  all: ["warehouses"] as const,
}

export const getWarehouses = async (): Promise<BackendResponse<Warehouse[]>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/admin/warehouses", method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const createWarehouse = async (payload: WarehousePayload): Promise<BackendResponse<Warehouse>> => {
  const configRequest: CustomAxiosRequestConfig<WarehousePayload> = { url: "/admin/warehouses", method: "POST", data: payload }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const updateWarehouse = async (id: number, payload: Partial<WarehousePayload>): Promise<BackendResponse<Warehouse>> => {
  const configRequest: CustomAxiosRequestConfig<Partial<WarehousePayload>> = { url: `/admin/warehouses/${id}`, method: "PATCH", data: payload }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
