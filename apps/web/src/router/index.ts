import { createRouter, createWebHistory } from "vue-router";

import StoreLayout from "@/layouts/StoreLayout.vue";

import accountRoutes from "@/features/account/routes";
import cartRoutes from "@/features/cart/routes";
import catalogRoutes from "@/features/catalog/routes";
import checkoutRoutes from "@/features/checkout/routes";
import helpRoutes from "@/features/help/routes";
import ordersRoutes from "@/features/orders/routes";
import { authenticationGuard } from "@/features/authentication/guards";
import authenticationRoutes from "@/features/authentication/routes";
import homeRoutes from "@/features/home/routes";
import { accessGuard } from "@/shared/navigation/guards";
import sharedRoutes from "@/shared/routes";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: StoreLayout,
      // Katalog terbuka untuk semua orang; halaman yang butuh login memakai meta.requiresAuth sendiri.
      children: [...homeRoutes, ...catalogRoutes, ...cartRoutes, ...checkoutRoutes, ...ordersRoutes, ...helpRoutes, ...accountRoutes],
    },

    ...authenticationRoutes,

    ...sharedRoutes,
  ],
  // Keep the scroll position when only the query changes (sort, page) on the same list; otherwise start at the top.
  scrollBehavior: (to, from, saved) => {
    if (saved) return saved;
    if (to.hash) return { el: to.hash, behavior: "smooth", top: 80 };
    if (to.path === from.path) return false;
    return { top: 0 };
  },
});

// Order matters: authentication first, then permissions/roles.
router.beforeEach(authenticationGuard);
router.beforeEach(accessGuard);

export default router;
