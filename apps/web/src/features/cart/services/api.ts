/** Server cart for signed-in buyers (`/cart`). Guests keep their cart in localStorage. */

import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type { ServerCartLine } from "../models"

export const getCart = async (): Promise<BackendResponse<ServerCartLine[]>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/cart", method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

/** Sets one variant's quantity; 0 removes it. The API caps it at the available stock. */
export const setCartItem = async (variantId: number, quantity: number): Promise<BackendResponse<ServerCartLine[]>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/cart/items", method: "PUT", data: { variant_id: variantId, quantity } }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

/** Adds the guest cart to the server cart after login. */
export const mergeCart = async (items: { variant_id: number; quantity: number }[]): Promise<BackendResponse<ServerCartLine[]>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/cart/merge", method: "POST", data: { items } }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const clearCart = async (): Promise<BackendResponse<ServerCartLine[]>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/cart", method: "DELETE" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
