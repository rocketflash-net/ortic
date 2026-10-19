import type { ComputedRef } from "vue"

import { adminUsersNavigation } from "@/features/admin-users/navigation"
import { customersNavigation } from "@/features/customers/navigation"
import { dashboardNavigation } from "@/features/dashboard/navigation"
import { productsNavigation } from "@/features/products/navigation"
import { shippingRatesNavigation } from "@/features/shipping-rates/navigation"
import { warehousesNavigation } from "@/features/warehouses/navigation"
import { translate } from "@/plugins/language"

import type { SidebarNavGroup, SidebarNavItem } from "./types"

/**
 * Central sidebar registry.
 *
 * @remarks
 * Each feature owns its own `navigation.ts` file.
 * This registry only aggregates those exports into renderable groups.
 *
 * When adding a new feature:
 * 1. Create `features/<feature>/navigation.ts`
 * 2. Import it here
 * 3. Append the exported items to the appropriate group
 */

/**
 * Route-dependent sidebar groups, rendered above the static groups.
 *
 * @remarks
 * Each entry is a composable (call it inside setup) returning its items for the current route, or an
 * empty list when it does not apply.
 */
export const contextualNavigationGroups: { id: string; useItems: () => ComputedRef<SidebarNavItem[]> }[] = []

export const sidebarNavigationGroups: SidebarNavGroup[] = [
  {
    id: "main",
    items: [...dashboardNavigation],
  },
  {
    id: "management",
    items: [{ type: "label", label: translate("utils.navigation.management") }, ...productsNavigation, ...customersNavigation, ...adminUsersNavigation],
  },
  {
    id: "tools",
    items: [{ type: "label", label: translate("utils.navigation.tools") }, ...shippingRatesNavigation],
  },
  {
    id: "settings",
    items: [{ type: "label", label: translate("utils.navigation.settings") }, ...warehousesNavigation],
  },
]
