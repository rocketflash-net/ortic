import type { RouteRecordRaw } from "vue-router"

import { Permission } from "@/shared/models/access"

import { ShippingRatesPageName } from "./models"

const shippingRatesRoutes: RouteRecordRaw[] = [
  {
    path: "shipping-rates",
    name: ShippingRatesPageName.SHIPPING_RATES,
    component: () => import("./views/ShippingRatesView.vue"),
    meta: { permissions: [Permission.DASHBOARD_VIEW] },
  },
]

export default shippingRatesRoutes
