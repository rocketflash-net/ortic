/**
 * Dashboard home: `GET /admin/dashboard` (today, last 7 days, work waiting for the team, low stock).
 */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type { DashboardSummary } from "../models"

export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
}

export const getDashboardSummary = async (): Promise<BackendResponse<DashboardSummary>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/admin/dashboard", method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
