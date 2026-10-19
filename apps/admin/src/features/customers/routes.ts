import type { RouteRecordRaw } from "vue-router";

import { Permission } from "@/shared/models/access";

import { CustomersPageName } from "./models";

const dashboardRoutes: RouteRecordRaw[] = [
  {
    path: "customers/list",
    name: CustomersPageName.CUSTOMERS_LIST,
    component: () => import("./views/CustomersListView.vue"),
    meta: {
      permissions: [Permission.CUSTOMERS_READ],
    },
  },
];

export default dashboardRoutes;
