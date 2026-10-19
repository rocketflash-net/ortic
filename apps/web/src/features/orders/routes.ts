import type { RouteRecordRaw } from "vue-router"

import { OrdersPageName } from "./models"

const ordersRoutes: RouteRecordRaw[] = [
  {
    path: "pesanan",
    name: OrdersPageName.ORDERS,
    component: () => import("./views/OrdersView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "pesanan/:code",
    name: OrdersPageName.ORDER,
    component: () => import("./views/OrderDetailView.vue"),
    props: true,
    meta: { requiresAuth: true },
  },
]

export default ordersRoutes
