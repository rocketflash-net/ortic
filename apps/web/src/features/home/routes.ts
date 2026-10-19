import type { RouteRecordRaw } from "vue-router"

import { HomePageName } from "./models"

const homeRoutes: RouteRecordRaw[] = [
  {
    path: "",
    name: HomePageName.HOME,
    component: () => import("./views/HomeView.vue"),
  },
]

export default homeRoutes
