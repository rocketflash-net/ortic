import type { RouteRecordRaw } from "vue-router"

import { CartPageName } from "./models"

// Guests can fill a cart; login is asked at checkout (Fase 2).
const cartRoutes: RouteRecordRaw[] = [
  {
    path: "keranjang",
    name: CartPageName.CART,
    component: () => import("./views/CartView.vue"),
  },
]

export default cartRoutes
