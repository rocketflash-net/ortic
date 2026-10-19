import type { RouteRecordRaw } from "vue-router"

import { Permission } from "@/shared/models/access"

import { WarehousesPageName } from "./models"

const warehousesRoutes: RouteRecordRaw[] = [
  {
    path: "settings/warehouses",
    name: WarehousesPageName.WAREHOUSES,
    component: () => import("./views/WarehousesView.vue"),
    meta: { permissions: [Permission.DASHBOARD_VIEW] },
  },
]

export default warehousesRoutes
