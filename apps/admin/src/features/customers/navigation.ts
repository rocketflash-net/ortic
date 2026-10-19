import { translate } from "@/plugins/language"
import { Permission } from "@/shared/models/access"
import type { SidebarNavItem } from "@/shared/navigation/types"

import { CustomersPageName } from "./models"

/**
 * Sidebar entries owned by the customers feature.
 *
 * @remarks
 * Keep labels, icons, route names, and permissions aligned with
 * `features/customers/routes.ts`.
 */
export const customersNavigation: SidebarNavItem[] = [
  {
    label: translate("utils.navigation.customers"),
    icon: "i-lucide-users",
    to: { name: CustomersPageName.CUSTOMERS_LIST },
    permissions: [Permission.CUSTOMERS_READ],
  },
]
