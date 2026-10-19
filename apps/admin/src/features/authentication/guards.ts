import type { NavigationGuard } from "vue-router"

import { safeRedirectPath } from "@/shared/helpers/redirect"

import { AuthenticationPageName } from "./models"
import { useAuthStore } from "./stores/authentication.store"

/**
 * Global guard for signed-in pages (`meta.requiresAuth`) and the login page (`meta.guestOnly`).
 *
 * @remarks
 * - No stored token: redirect straight to login without calling the API.
 * - Stored token: `GET /auth/me` once per page load decides (the axios interceptor refreshes an expired access token).
 * - The original destination is kept in `?redirect=` so login can return there.
 */
export const authenticationGuard: NavigationGuard = async (to) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const guestOnly = to.matched.some((record) => record.meta.guestOnly)
  if (!requiresAuth && !guestOnly) return true

  const isSignedIn = await useAuthStore().ensureSession()

  if (requiresAuth && !isSignedIn) {
    return { name: AuthenticationPageName.LOGIN, query: { redirect: to.fullPath } }
  }
  if (guestOnly && isSignedIn) {
    return safeRedirectPath(to.query.redirect)
  }
  return true
}
