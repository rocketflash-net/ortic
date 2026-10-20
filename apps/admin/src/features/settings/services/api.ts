/**
 * Store settings (Owner): `/admin/settings`, categories with per-category markup (`/admin/categories`), and the
 * couriers offered at checkout (`/admin/couriers`). Markup and rounding changes reprice every unlocked variant;
 * preview the effect first with the `*-preview` endpoints.
 */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type { AdminCategory, CategoryPayload, Courier, CourierPayload, PricingPreview, SettingsResponse, StoreSettings } from "../models"

export const settingsQueryKeys = {
  store: ["settings", "store"] as const,
  categories: ["settings", "categories"] as const,
  couriers: ["settings", "couriers"] as const,
}

export const getSettings = async (): Promise<BackendResponse<SettingsResponse>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/admin/settings", method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const updateSettings = async (payload: Partial<StoreSettings>): Promise<BackendResponse<SettingsResponse>> => {
  const configRequest: CustomAxiosRequestConfig<Partial<StoreSettings>> = { url: "/admin/settings", method: "PUT", data: payload }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const previewPricing = async (payload: { markup_percent?: number; price_rounding?: number }): Promise<BackendResponse<PricingPreview>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/admin/settings/pricing-preview", method: "POST", data: payload }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const getAdminCategories = async (): Promise<BackendResponse<AdminCategory[]>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/admin/categories", method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const updateCategory = async (id: number, payload: CategoryPayload): Promise<BackendResponse<AdminCategory & { repriced_variants: number }>> => {
  const configRequest: CustomAxiosRequestConfig<CategoryPayload> = { url: `/admin/categories/${id}`, method: "PATCH", data: payload }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const previewCategoryMarkup = async (id: number, markupPercent: number | null): Promise<BackendResponse<PricingPreview>> => {
  const configRequest: CustomAxiosRequestConfig = { url: `/admin/categories/${id}/markup-preview`, method: "POST", data: { markup_percent: markupPercent } }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const getCouriers = async (): Promise<BackendResponse<{ items: Courier[]; max_active: number }>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/admin/couriers", method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const updateCourier = async (id: number, payload: CourierPayload): Promise<BackendResponse<Courier>> => {
  const configRequest: CustomAxiosRequestConfig<CourierPayload> = { url: `/admin/couriers/${id}`, method: "PATCH", data: payload }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
