import { translate } from "@/plugins/language"
import { Permission } from "@/shared/models/access"
import type { SidebarNavItem } from "@/shared/navigation/types"

import { AdminUsersPageName } from "./models"

/**
 * Sidebar entries owned by the admin accounts feature.
 *
 * @remarks
 * Keep labels, icons, route names, and permissions aligned with `features/admin-users/routes.ts`.
 */
export const adminUsersNavigation: SidebarNavItem[] = [
  {
    label: translate("utils.navigation.admins"),
    icon: "i-lucide-shield-check",
    to: { name: AdminUsersPageName.ADMIN_USERS },
    permissions: [Permission.ADMINS_MANAGE],
  },
]
