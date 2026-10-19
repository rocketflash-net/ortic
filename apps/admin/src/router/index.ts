import { createRouter, createWebHistory } from "vue-router";

import AppLayout from "@/layouts/AppLayout.vue";

import adminUsersRoutes from "@/features/admin-users/routes";
import { authenticationGuard } from "@/features/authentication/guards";
import authenticationRoutes from "@/features/authentication/routes";
import customersRoutes from "@/features/customers/routes";
import dashboardRoutes from "@/features/dashboard/routes";
import profileRoutes from "@/features/profile/routes";
import productsRoutes from "@/features/products/routes";
import shippingRatesRoutes from "@/features/shipping-rates/routes";
import warehousesRoutes from "@/features/warehouses/routes";
import { accessGuard } from "@/shared/navigation/guards";
import sharedRoutes from "@/shared/routes";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: AppLayout,
      // Every page inside AppLayout requires a signed-in user (see the guards below).
      meta: { requiresAuth: true },
      children: [...dashboardRoutes, ...productsRoutes, ...customersRoutes, ...adminUsersRoutes, ...shippingRatesRoutes, ...warehousesRoutes, ...profileRoutes],
    },

    ...authenticationRoutes,

    ...sharedRoutes,
  ],
});

// Order matters: authentication first, then permissions/roles.
router.beforeEach(authenticationGuard);
router.beforeEach(accessGuard);

export default router;
