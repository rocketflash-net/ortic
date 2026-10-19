import { translate } from "@/plugins/language"
import { Permission } from "@/shared/models/access"
import type { SidebarNavItem } from "@/shared/navigation/types"

import { DashboardPageName } from "./models"

/**
 * Sidebar entries owned by the dashboard feature.
 *
 * @remarks
 * Keep labels, icons, route names, and permissions aligned with
 * `features/dashboard/routes.ts`.
 */
export const dashboardNavigation: SidebarNavItem[] = [
  {
    label: translate("utils.navigation.dashboard"),
    icon: "i-lucide-layout-dashboard",
    to: { name: DashboardPageName.DASHBOARD },
    exact: true,
    permissions: [Permission.DASHBOARD_VIEW],
  },
]
