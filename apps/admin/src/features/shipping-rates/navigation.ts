import { translate } from "@/plugins/language"
import { Permission } from "@/shared/models/access"
import type { SidebarNavItem } from "@/shared/navigation/types"

import { ShippingRatesPageName } from "./models"

/**
 * Sidebar entries owned by the shipping-rates feature.
 *
 * @remarks
 * Keep labels, icons, route names, and permissions aligned with `features/shipping-rates/routes.ts`.
 */
export const shippingRatesNavigation: SidebarNavItem[] = [
  {
    label: translate("utils.navigation.shipping_rates"),
    icon: "i-lucide-truck",
    to: { name: ShippingRatesPageName.SHIPPING_RATES },
    permissions: [Permission.DASHBOARD_VIEW],
  },
]
