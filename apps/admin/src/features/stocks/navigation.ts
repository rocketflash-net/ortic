import { translate } from "@/plugins/language"
import { Permission } from "@/shared/models/access"
import type { SidebarNavItem } from "@/shared/navigation/types"

import { StocksPageName } from "./models"

/**
 * Sidebar entries owned by the stocks feature.
 *
 * @remarks
 * Keep labels, icons, route names, and permissions aligned with `features/stocks/routes.ts`.
 */
export const stocksNavigation: SidebarNavItem[] = [
  {
    label: translate("utils.navigation.stocks"),
    icon: "i-lucide-boxes",
    to: { name: StocksPageName.STOCKS },
    permissions: [Permission.STOCKS_MANAGE],
  },
]
