import { translate } from "@/plugins/language"
import { Permission } from "@/shared/models/access"
import type { SidebarNavItem } from "@/shared/navigation/types"

import { WarehousesPageName } from "./models"

/**
 * Sidebar entries owned by the warehouses feature.
 *
 * @remarks
 * Keep labels, icons, route names, and permissions aligned with `features/warehouses/routes.ts`.
 */
export const warehousesNavigation: SidebarNavItem[] = [
  {
    label: translate("utils.navigation.warehouses"),
    icon: "i-lucide-warehouse",
    to: { name: WarehousesPageName.WAREHOUSES },
    permissions: [Permission.DASHBOARD_VIEW],
  },
]
