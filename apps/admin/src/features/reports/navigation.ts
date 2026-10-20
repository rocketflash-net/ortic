import { translate } from "@/plugins/language"
import { Permission } from "@/shared/models/access"
import type { SidebarNavItem } from "@/shared/navigation/types"

import { ReportsPageName } from "./models"

/**
 * Sidebar entries owned by the reports feature.
 *
 * @remarks
 * Keep labels, icons, route names, and permissions aligned with `features/reports/routes.ts`.
 */
export const reportsNavigation: SidebarNavItem[] = [
  {
    label: translate("utils.navigation.sales_report"),
    icon: "i-lucide-chart-line",
    to: { name: ReportsPageName.SALES },
    permissions: [Permission.REPORTS_READ],
  },
  {
    label: translate("utils.navigation.stock_report"),
    icon: "i-lucide-chart-bar",
    to: { name: ReportsPageName.STOCK },
    permissions: [Permission.REPORTS_READ],
  },
]
