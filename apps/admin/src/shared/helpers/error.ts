import type { ApiError } from "@/shared/models/api"

/**
 * Narrows an unknown rejection into the {@link ApiError} shape produced by the
 * axios response interceptor.
 */
const isApiError = (error: unknown): error is ApiError =>
  typeof error === "object" && error !== null && "message" in error

/**
 * Extracts a human-readable message from a failed request.
 *
 * @param error - Value rejected by a service call.
 * @param fallback - Message used when nothing readable is available.
 * @returns The API `responseMessage` when present, otherwise the transport message or fallback.
 */
export const getApiErrorMessage = (error: unknown, fallback = "Something went wrong."): string => {
  if (!isApiError(error)) {
    return fallback
  }

  const serverMessage = error.data?.responseMessage

  if (typeof serverMessage === "string" && serverMessage) {
    return serverMessage
  }

  return error.message || fallback
}

/**
 * Domain error code of a failed request, e.g. `"draft_limit_reached"`.
 *
 * @returns The API `responseCode`, or undefined when the request never got a response.
 */
export const getApiErrorCode = (error: unknown): string | undefined =>
  isApiError(error) ? error.data?.responseCode : undefined

/** One invalid field from a 422 response, e.g. `{ field: "variants.0.sku", message: "SKU is already used" }`. */
export type ApiFieldError = { field: string; message: string }

/**
 * Field errors of a failed request (validation 422, or a 409 that names the conflicting field).
 *
 * @returns The `additionalInfo` list when it has that shape, otherwise an empty list.
 */
export const getApiFieldErrors = (error: unknown): ApiFieldError[] => {
  const info = isApiError(error) ? error.data?.additionalInfo : undefined
  if (!Array.isArray(info)) return []
  return info.filter(
    (item): item is ApiFieldError => typeof item === "object" && item !== null && typeof item.field === "string" && typeof item.message === "string",
  )
}
