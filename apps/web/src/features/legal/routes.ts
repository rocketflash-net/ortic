import type { RouteRecordRaw } from "vue-router"

import { LegalPageName } from "./models"

// Kebijakan toko (terbuka untuk semua; ditautkan dari footer, bantuan, dan checkout).
const legalRoutes: RouteRecordRaw[] = [
  { path: "syarat-ketentuan", name: LegalPageName.TERMS, component: () => import("./views/LegalView.vue"), props: { page: "terms" } },
  { path: "kebijakan-privasi", name: LegalPageName.PRIVACY, component: () => import("./views/LegalView.vue"), props: { page: "privacy" } },
  { path: "kebijakan-retur", name: LegalPageName.RETURNS, component: () => import("./views/LegalView.vue"), props: { page: "returns" } },
]

export default legalRoutes
