import type { RouteRecordRaw } from "vue-router"

import { HelpPageName } from "./models"

const helpRoutes: RouteRecordRaw[] = [
  {
    path: "bantuan",
    name: HelpPageName.HELP,
    component: () => import("./views/HelpView.vue"),
  },
]

export default helpRoutes
