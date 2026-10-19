import type { RouteRecordRaw } from "vue-router"

import { AuthenticationPageName } from "./models"

/**
 * Public authentication routes rendered inside {@link AuthenticationLayout}.
 *
 * @remarks
 * These routes live outside `AppLayout` and do not require an active session.
 * The paths must match where the API redirects after Google login:
 * `/login?error=...` on failure and `/login/callback?code=...&redirect=...` on success.
 */
const authenticationRoutes: RouteRecordRaw[] = [
  {
    path: "/login",
    component: () => import("@/features/authentication/layouts/AuthenticationLayout.vue"),
    children: [
      {
        path: "",
        name: AuthenticationPageName.LOGIN,
        component: () => import("@/features/authentication/views/LoginView.vue"),
        meta: { guestOnly: true },
      },
      {
        path: "callback",
        name: AuthenticationPageName.LOGIN_CALLBACK,
        component: () => import("@/features/authentication/views/LoginCallbackView.vue"),
      },
    ],
  },
]

export default authenticationRoutes
