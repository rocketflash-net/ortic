/**
 * Admin customers API client.
 */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type { Customer, CustomerListInfo, CustomerListParams } from "../models"

export type CustomerListResponse = BackendResponse<Customer[]> & { additionalInfo: CustomerListInfo }

/** TanStack Query keys for the customers feature. */
export const customerQueryKeys = {
  all: ["customers"] as const,
  list: (params: CustomerListParams) => [...customerQueryKeys.all, "list", params] as const,
}

/**
 * Fetches one page of registered users, newest first.
 *
 * @param params - Pagination and search. An empty search is omitted from the request.
 */
export const getCustomers = async (params: CustomerListParams): Promise<CustomerListResponse> => {
  const configRequest: CustomAxiosRequestConfig = {
    url: "/admin/users",
    method: "GET",
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
    },
  }

  const { data } = await axiosInstance.request(configRequest)

  return data
}
