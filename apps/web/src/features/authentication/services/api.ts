/**
 * Authentication API client.
 *
 * @remarks
 * Login endpoints return an access/refresh token pair, which callers store with `saveTokens`.
 * Authenticated calls get `Authorization: Bearer` from the axios interceptor, which also refreshes expired tokens.
 */

import axiosInstance, { apiBaseUrl } from "@/plugins/axios"
import type { TokenPairResponse } from "@/shared/helpers/token-storage"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import type {
  ExchangeGoogleCodeRequest,
  RequestEmailCodeRequest,
  RequestEmailCodeResponse,
  VerifyEmailCodeRequest,
  VerifyEmailCodeResponse,
} from "../models/email-login.model"
import type { MeResponse } from "../models/user.model"

/**
 * Full-page URL that starts Google OAuth on the API.
 *
 * @param redirect - Dashboard path to return to after login.
 */
export const googleLoginUrl = (redirect?: string): string => {
  // app=web: the API sends the Google callback back to this store, not to the admin dashboard.
  const query = new URLSearchParams({ app: "web", ...(redirect ? { redirect } : {}) })
  return `${apiBaseUrl}/auth/google/start?${query}`
}

/**
 * Exchanges the one-time code from the Google callback (`/login/callback?code=`) for a token pair.
 *
 * @param payload - The code from the callback URL.
 */
export const exchangeGoogleCode = async (payload: ExchangeGoogleCodeRequest): Promise<BackendResponse<TokenPairResponse>> => {
  const configRequest: CustomAxiosRequestConfig<ExchangeGoogleCodeRequest> = {
    url: "/auth/google/exchange",
    method: "POST",
    data: payload,
    meta: { requiresAuth: false },
  }

  const { data } = await axiosInstance.request(configRequest)
  return data
}

/**
 * Emails a 6-digit login code.
 *
 * @param payload - Email address to send the code to.
 */
export const requestEmailCode = async (
  payload: RequestEmailCodeRequest,
): Promise<BackendResponse<RequestEmailCodeResponse>> => {
  const configRequest: CustomAxiosRequestConfig<RequestEmailCodeRequest> = {
    url: "/auth/email/request",
    method: "POST",
    data: payload,
    meta: { requiresAuth: false },
  }

  const { data } = await axiosInstance.request(configRequest)
  return data
}

/**
 * Verifies the login code and returns a token pair plus the dashboard path to open.
 *
 * @param payload - Email, code, and optional post-login path.
 */
export const verifyEmailCode = async (
  payload: VerifyEmailCodeRequest,
): Promise<BackendResponse<VerifyEmailCodeResponse>> => {
  const configRequest: CustomAxiosRequestConfig<VerifyEmailCodeRequest> = {
    url: "/auth/email/verify",
    method: "POST",
    data: payload,
    meta: { requiresAuth: false },
  }

  const { data } = await axiosInstance.request(configRequest)
  return data
}

/**
 * Current user and access profile. Rejects with status 401 when the session cannot be renewed.
 */
export const getMe = async (): Promise<BackendResponse<MeResponse>> => {
  const configRequest: CustomAxiosRequestConfig = {
    url: "/auth/me",
    method: "GET",
  }

  const { data } = await axiosInstance.request(configRequest)
  return data
}

/**
 * Ends the session on the API: both tokens stop working immediately.
 */
export const requestLogout = async (): Promise<BackendResponse<null>> => {
  const configRequest: CustomAxiosRequestConfig = {
    url: "/auth/logout",
    method: "POST",
  }

  const { data } = await axiosInstance.request(configRequest)
  return data
}
