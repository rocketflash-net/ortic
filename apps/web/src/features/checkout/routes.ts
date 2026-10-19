import type { RouteRecordRaw } from "vue-router"

import { CheckoutPageName } from "./models"

const checkoutRoutes: RouteRecordRaw[] = [
  {
    path: "checkout",
    name: CheckoutPageName.CHECKOUT,
    component: () => import("./views/CheckoutView.vue"),
    meta: { requiresAuth: true },
  },
]

export default checkoutRoutes
