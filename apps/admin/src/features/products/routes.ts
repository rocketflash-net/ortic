import type { RouteRecordRaw } from "vue-router"

import { Permission } from "@/shared/models/access"

import { ProductsPageName } from "./models"

const productsRoutes: RouteRecordRaw[] = [
  {
    path: "products",
    name: ProductsPageName.PRODUCTS,
    component: () => import("./views/ProductsListView.vue"),
    meta: { permissions: [Permission.PRODUCTS_MANAGE] },
  },
  {
    path: "products/new",
    name: ProductsPageName.PRODUCT_CREATE,
    component: () => import("./views/ProductFormView.vue"),
    meta: { permissions: [Permission.PRODUCTS_MANAGE] },
  },
  {
    path: "products/:id(\\d+)",
    name: ProductsPageName.PRODUCT_EDIT,
    component: () => import("./views/ProductFormView.vue"),
    props: true,
    meta: { permissions: [Permission.PRODUCTS_MANAGE] },
  },
]

export default productsRoutes
