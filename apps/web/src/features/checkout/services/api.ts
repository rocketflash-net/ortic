/** Address book, shipping quote, and order placement (login required). */

import type { Order } from "@/features/orders/models"
import axiosInstance from "@/plugins/axios"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type { Address, AddressPayload, CheckoutItemInput, CheckoutPayload, CheckoutQuote, ShippingArea } from "../models"

export const checkoutQueryKeys = {
  addresses: ["me", "addresses"] as const,
  quote: (addressId: number, items: CheckoutItemInput[], insure: boolean) => ["checkout", "quote", addressId, items, insure] as const,
  areas: (query: string) => ["shipping-areas", query] as const,
}

export const getAddresses = async (): Promise<BackendResponse<Address[]>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/me/addresses", method: "GET" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const saveAddress = async (payload: AddressPayload, id?: number): Promise<BackendResponse<Address>> => {
  const configRequest: CustomAxiosRequestConfig<AddressPayload> = id
    ? { url: `/me/addresses/${id}`, method: "PUT", data: payload }
    : { url: "/me/addresses", method: "POST", data: payload }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const deleteAddress = async (id: number): Promise<BackendResponse<null>> => {
  const configRequest: CustomAxiosRequestConfig = { url: `/me/addresses/${id}`, method: "DELETE" }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

/** Biteship area search; billed per call, so callers debounce and wait for 3+ characters. */
export const searchShippingAreas = async (query: string): Promise<BackendResponse<ShippingArea[]>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/shipping/areas", method: "GET", params: { q: query } }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

export const getCheckoutQuote = async (addressId: number, items: CheckoutItemInput[], insure: boolean): Promise<BackendResponse<CheckoutQuote>> => {
  const configRequest: CustomAxiosRequestConfig = { url: "/checkout/quote", method: "POST", data: { address_id: addressId, items, insure } }
  const { data } = await axiosInstance.request(configRequest)
  return data
}

/** Creates the order and its QRIS. */
export const placeOrder = async (payload: CheckoutPayload): Promise<BackendResponse<Order>> => {
  const configRequest: CustomAxiosRequestConfig<CheckoutPayload> = { url: "/checkout", method: "POST", data: payload }
  const { data } = await axiosInstance.request(configRequest)
  return data
}
