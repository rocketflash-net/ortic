import type { RouteRecordRaw } from "vue-router"

import { Permission } from "@/shared/models/access"

import { ReportsPageName } from "./models"

const reportsRoutes: RouteRecordRaw[] = [
  {
    path: "reports/sales",
    name: ReportsPageName.SALES,
    component: () => import("./views/SalesReportView.vue"),
    meta: { permissions: [Permission.REPORTS_READ] },
  },
  {
    path: "reports/stock",
    name: ReportsPageName.STOCK,
    component: () => import("./views/StockReportView.vue"),
    meta: { permissions: [Permission.REPORTS_READ] },
  },
]

export default reportsRoutes
