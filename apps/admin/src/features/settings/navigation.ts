import { translate } from "@/plugins/language"
import { Permission } from "@/shared/models/access"
import type { SidebarNavItem } from "@/shared/navigation/types"

import { SettingsPageName } from "./models"

/**
 * Sidebar entries owned by the settings feature (store, categories, couriers).
 *
 * @remarks
 * Keep labels, icons, route names, and permissions aligned with `features/settings/routes.ts`.
 */
export const settingsNavigation: SidebarNavItem[] = [
  {
    label: translate("utils.navigation.store_settings"),
    icon: "i-lucide-store",
    to: { name: SettingsPageName.STORE },
    permissions: [Permission.SETTINGS_MANAGE],
  },
  {
    label: translate("utils.navigation.categories"),
    icon: "i-lucide-tags",
    to: { name: SettingsPageName.CATEGORIES },
    permissions: [Permission.PRODUCTS_MANAGE],
  },
  {
    label: translate("utils.navigation.couriers"),
    icon: "i-lucide-truck",
    to: { name: SettingsPageName.COURIERS },
    permissions: [Permission.COURIERS_MANAGE],
  },
]
