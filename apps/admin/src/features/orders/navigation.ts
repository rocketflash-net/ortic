import { translate } from "@/plugins/language"
import { Permission } from "@/shared/models/access"
import type { SidebarNavItem } from "@/shared/navigation/types"

import { OrdersPageName } from "./models"

/**
 * Sidebar entries owned by the orders feature.
 *
 * @remarks
 * Keep labels, icons, route names, and permissions aligned with `features/orders/routes.ts`.
 */
export const ordersNavigation: SidebarNavItem[] = [
  {
    label: translate("utils.navigation.orders"),
    icon: "i-lucide-shopping-bag",
    to: { name: OrdersPageName.ORDERS },
    permissions: [Permission.ORDERS_MANAGE],
  },
]
