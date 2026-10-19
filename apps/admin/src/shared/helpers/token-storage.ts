/**
 * Access & refresh token storage (localStorage, shared by all tabs).
 *
 * @remarks
 * Tokens are readable by any script on this origin, so never render untrusted HTML (`v-html`) in the dashboard.
 * Storage access is wrapped in try/catch because it can throw (private mode, blocked storage).
 */

const STORAGE_KEY = "ortic.admin.auth.tokens"

/** Token pair returned by the API on login and refresh. */
export type StoredTokens = {
  accessToken: string
  refreshToken: string
}

/** Token fields as sent by the API (`/auth/email/verify`, `/auth/google/exchange`, `/auth/refresh`). */
export type TokenPairResponse = {
  access_token: string
  refresh_token: string
  token_type: "Bearer"
  expires_in: number
}

export function getTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredTokens>
    return parsed.accessToken && parsed.refreshToken ? { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken } : null
  } catch {
    return null
  }
}

export function saveTokens(tokens: TokenPairResponse): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token }))
  } catch {
    // Storage unavailable: the session only lasts for this page load.
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear.
  }
}

/** Whether a sign-in has happened on this browser (the tokens may still be expired). */
export function hasTokens(): boolean {
  return getTokens() !== null
}
