import type { AxiosRequestConfig } from "axios"

/**
 * Axios request config extended with app-specific metadata.
 *
 * @typeParam D - Request body type.
 */
export interface CustomAxiosRequestConfig<D = unknown> extends AxiosRequestConfig<D> {
  meta?: {
    /**
     * When false, the request is sent without the access token and a 401 is returned as-is
     * (no token refresh, no redirect to login). Use for the auth endpoints themselves.
     */
    requiresAuth?: boolean
  }
}

/**
 * Standard API response envelope used across backend endpoints.
 *
 * @typeParam ResponseData - Shape of the `data` field on success.
 */
export type ApiResponse<ResponseData = null> = {
  status: boolean
  message: string
  data: ResponseData | null
}

/** Common pagination query parameters for list endpoints. */
export type PaginationRequest = {
  page: number
  limit: number
  /** Optional free-text search term. */
  search?: string
}

/** Pagination metadata returned alongside list results. */
export type PaginationResponse = {
  page: number
  limit: number
  total: number
  total_page: number
}

/**
 * Response envelope actually returned by `apps/api` (`ResponseDto`).
 *
 * @typeParam ResponseData - Shape of the `data` field on success.
 */
export type BackendResponse<ResponseData = null> = {
  /** "00" on success, otherwise a numeric or domain error code (e.g. "invalid_login_code"). */
  responseCode: string
  responseMessage: string
  data: ResponseData | null
  additionalInfo: unknown
}

/** Error object rejected by the axios response interceptor. */
export type ApiError = {
  message: string
  /** HTTP status, absent when the request never got a response. */
  status?: number
  data?: BackendResponse<unknown>
}
