import type { RouteRecordRaw } from "vue-router"

import { UtilsPageName } from "./models"

/**
 * Global utility routes registered outside feature modules.
 *
 * @remarks
 * The catch-all 404 route must remain last in the router definition.
 */
const utilRoutes: RouteRecordRaw[] = [
  {
    path: "/:pathMatch(.*)*",
    name: UtilsPageName.PAGE_NOT_FOUND,
    component: () => import("@/shared/views/NotFoundView.vue"),
  },

  {
    path: "/forbidden",
    name: UtilsPageName.FORBIDDEN,
    component: () => import("@/shared/views/ForbiddenView.vue"),
  },
]

export default utilRoutes
