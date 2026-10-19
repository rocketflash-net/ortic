import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios"

import { clearTokens, getTokens, saveTokens, type TokenPairResponse } from "@/shared/helpers/token-storage"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

type RetriableRequestConfig = InternalAxiosRequestConfig & CustomAxiosRequestConfig & { _retried?: boolean }

const REFRESH_LOCK = "ortic-web-auth-refresh"

/** Called when the session can no longer be renewed (refresh token missing, expired, or revoked). */
let onSessionExpired: () => void = () => {}

/**
 * Registers what to do when the session ends unexpectedly (e.g. clear the store and go to the login page).
 *
 * @remarks
 * Registered from `main.ts` so this plugin does not import the router or stores (no import cycles).
 */
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

/** Refresh shared by all requests of this tab that hit 401 at the same time. */
let refreshInFlight: Promise<string | null> | null = null

/**
 * Runs `task` while holding a lock shared by every tab of this origin, so two tabs never spend the same refresh token
 * (the API treats a reused refresh token as stolen and revokes the session). Falls back to no lock on old browsers.
 */
async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  return navigator.locks ? navigator.locks.request(REFRESH_LOCK, task) : task()
}

/**
 * Exchanges the refresh token for a new token pair and returns the new access token, or null when the session is over.
 *
 * @param axiosInstance - Instance used for the refresh call (skips this interceptor via `requiresAuth: false`).
 * @param failedAccessToken - Access token the failing request used; if another tab already refreshed, its token is reused.
 */
function refreshAccessToken(axiosInstance: AxiosInstance, failedAccessToken: string | undefined): Promise<string | null> {
  refreshInFlight ??= withRefreshLock(async () => {
    const stored = getTokens()
    if (!stored) return null
    if (stored.accessToken !== failedAccessToken) return stored.accessToken

    try {
      const config: CustomAxiosRequestConfig = { url: "/auth/refresh", method: "POST", data: { refresh_token: stored.refreshToken }, meta: { requiresAuth: false } }
      const { data } = await axiosInstance.request<BackendResponse<TokenPairResponse>>(config)
      if (!data.data) return null
      saveTokens(data.data)
      return data.data.access_token
    } catch {
      return null
    }
  }).finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

const bearerOf = (config: InternalAxiosRequestConfig): string | undefined => config.headers.get("Authorization")?.toString().replace(/^Bearer /, "")

export function setupInterceptors(axiosInstance: AxiosInstance) {
  // Attach the access token. Auth endpoints (login, refresh) opt out with `meta.requiresAuth: false`.
  axiosInstance.interceptors.request.use((config) => {
    const accessToken = getTokens()?.accessToken
    if ((config as RetriableRequestConfig).meta?.requiresAuth !== false && accessToken) {
      config.headers.set("Authorization", `Bearer ${accessToken}`)
    }
    return config
  })

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetriableRequestConfig | undefined

      // Access token expired or revoked: refresh once, then replay the original request.
      if (error.response?.status === 401 && config && config.meta?.requiresAuth !== false && !config._retried) {
        config._retried = true
        const accessToken = await refreshAccessToken(axiosInstance, bearerOf(config))
        if (accessToken) {
          config.headers.set("Authorization", `Bearer ${accessToken}`)
          return axiosInstance.request(config)
        }
        clearTokens()
        onSessionExpired()
      }

      if (error.response) {
        console.error("Response error:", { status: error.response.status, data: error.response.data })
      } else if (error.request) {
        console.error("No response from server:", error.request)
      } else {
        console.error("Axios config error:", error.message)
      }

      return Promise.reject({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      })
    },
  )
}
