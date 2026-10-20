import type { RouteRecordRaw } from "vue-router"

import { Permission } from "@/shared/models/access"

import { SettingsPageName } from "./models"

const settingsRoutes: RouteRecordRaw[] = [
  {
    path: "settings/store",
    name: SettingsPageName.STORE,
    component: () => import("./views/StoreSettingsView.vue"),
    meta: { permissions: [Permission.SETTINGS_MANAGE] },
  },
  {
    path: "settings/categories",
    name: SettingsPageName.CATEGORIES,
    component: () => import("./views/CategoriesView.vue"),
    meta: { permissions: [Permission.PRODUCTS_MANAGE] },
  },
  {
    path: "settings/couriers",
    name: SettingsPageName.COURIERS,
    component: () => import("./views/CouriersView.vue"),
    meta: { permissions: [Permission.COURIERS_MANAGE] },
  },
]

export default settingsRoutes
