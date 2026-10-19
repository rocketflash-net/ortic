import type { RouteRecordRaw } from "vue-router"

import { Permission } from "@/shared/models/access"

import { AdminUsersPageName } from "./models"

const adminUsersRoutes: RouteRecordRaw[] = [
  {
    path: "admin/admins",
    name: AdminUsersPageName.ADMIN_USERS,
    component: () => import("./views/AdminUsersView.vue"),
    meta: { permissions: [Permission.ADMINS_MANAGE] },
  },
]

export default adminUsersRoutes
