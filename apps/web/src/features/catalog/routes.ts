import type { RouteRecordRaw } from "vue-router"

import { CatalogPageName } from "./models"

const catalogRoutes: RouteRecordRaw[] = [
  {
    path: "produk",
    name: CatalogPageName.PRODUCTS,
    component: () => import("./views/CatalogView.vue"),
  },
  {
    path: "kategori/:slug",
    name: CatalogPageName.CATEGORY,
    component: () => import("./views/CatalogView.vue"),
    props: true,
  },
  {
    path: "produk/:slug",
    name: CatalogPageName.PRODUCT,
    component: () => import("./views/ProductDetailView.vue"),
    props: true,
  },
]

export default catalogRoutes
