import type { RouteRecordRaw } from "vue-router"

import { Permission } from "@/shared/models/access"

import { StocksPageName } from "./models"

const stocksRoutes: RouteRecordRaw[] = [
  {
    path: "stocks",
    name: StocksPageName.STOCKS,
    component: () => import("./views/StocksView.vue"),
    meta: { permissions: [Permission.STOCKS_MANAGE] },
  },
]

export default stocksRoutes
