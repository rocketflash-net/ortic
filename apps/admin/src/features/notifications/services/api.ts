/**
 * Admin notifications: `/admin/notifications` (bell list + mark all read). Live updates arrive through the SSE stream
 * (see `composables/useNotificationStream.ts`).
 */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type { AdminNotification, NotificationListInfo } from "../models"

export type NotificationListResponse = BackendResponse<AdminNotification[]> & { additionalInfo: NotificationListInfo }

export const notificationQueryKeys = {
  all: ["notifications"] as const,
}

export const getNotifications = async (limit = 15): Promise<NotificationListResponse> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/admin/notifications", method: "GET", params: { page: 1, limit } }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const markNotificationsRead = async (): Promise<BackendResponse<{ unread_count: number }>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/admin/notifications/read", method: "POST" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
