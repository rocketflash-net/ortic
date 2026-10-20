/**
 * Admin accounts (superadmin only): `/admin/admins` to list and add, `PATCH /admin/users/{id}` to change or revoke a
 * role. Every change is audited by the API, which also signs the affected user out so their new role applies right
 * away.
 */

import axiosInstance from "@/plugins/axios"
import type { CustomerRole } from "@/features/customers/models"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type { AdminRole, AdminUser } from "../models"

export const adminUserQueryKeys = {
  all: ["admin-users"] as const,
}

export const getAdminUsers = async (): Promise<BackendResponse<AdminUser[]>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/admin/admins", method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

/** Gives the email an admin role. An unregistered email gets an account it can sign in to with OTP or Google. */
export const addAdminUser = async (email: string, role: AdminRole): Promise<BackendResponse<AdminUser>> => {
  const configRequest: CustomAxiosRequestConfig<{ email: string; role: AdminRole }> = {
    url: "/admin/admins",
    method: "POST",
    data: { email, role },
  }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

/** Ties a Staf to one warehouse (only its orders & stock), or `null` for all warehouses. Owner only. */
export const updateAdminWarehouse = async (id: number, warehouseId: number | null): Promise<BackendResponse<AdminUser>> => {
  const configRequest: CustomAxiosRequestConfig<{ warehouse_id: number | null }> = {
    url: `/admin/users/${id}/warehouse`,
    method: "PATCH",
    data: { warehouse_id: warehouseId },
  }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

/**
 * Changes a user's role; `user` revokes admin access. The API refuses your own account and demoting the last
 * superadmin.
 */
export const updateUserRole = async (id: number, role: CustomerRole): Promise<BackendResponse<AdminUser>> => {
  const configRequest: CustomAxiosRequestConfig<{ role: CustomerRole }> = {
    url: `/admin/users/${id}`,
    method: "PATCH",
    data: { role },
  }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
