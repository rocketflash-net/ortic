import type { RouteRecordRaw } from "vue-router"

import { Permission } from "@/shared/models/access"

import { OrdersPageName } from "./models"

const ordersRoutes: RouteRecordRaw[] = [
  {
    path: "orders",
    name: OrdersPageName.ORDERS,
    component: () => import("./views/OrdersListView.vue"),
    meta: { permissions: [Permission.ORDERS_MANAGE] },
  },
  {
    path: "orders/:code",
    name: OrdersPageName.ORDER_DETAIL,
    component: () => import("./views/OrderDetailView.vue"),
    props: true,
    meta: { permissions: [Permission.ORDERS_MANAGE] },
  },
]

/** Print-only pages rendered without the dashboard layout (no sidebar). */
export const ordersStandaloneRoutes: RouteRecordRaw[] = [
  {
    path: "/orders/:code/label",
    name: OrdersPageName.ORDER_LABEL,
    component: () => import("./views/OrderLabelView.vue"),
    props: true,
    meta: { requiresAuth: true, permissions: [Permission.ORDERS_MANAGE] },
  },
]

export default ordersRoutes
