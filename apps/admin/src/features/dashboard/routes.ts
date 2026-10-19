import type { RouteRecordRaw } from "vue-router";

import { Permission } from "@/shared/models/access";

import { DashboardPageName } from "./models";

const dashboardRoutes: RouteRecordRaw[] = [
  {
    path: "",
    redirect: { name: DashboardPageName.DASHBOARD },
  },
  {
    path: "dashboard",
    name: DashboardPageName.DASHBOARD,
    component: () => import("./views/DashboardView.vue"),
    meta: {
      permissions: [Permission.DASHBOARD_VIEW],
    },
  },
];

export default dashboardRoutes;
