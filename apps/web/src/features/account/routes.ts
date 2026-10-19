import type { RouteRecordRaw } from "vue-router"

import { AccountPageName } from "./models"

const accountRoutes: RouteRecordRaw[] = [
  {
    path: "akun",
    name: AccountPageName.ACCOUNT,
    component: () => import("./views/AccountView.vue"),
    meta: { requiresAuth: true },
  },
]

export default accountRoutes
