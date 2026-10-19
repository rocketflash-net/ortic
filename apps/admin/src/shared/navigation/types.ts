import type { NavigationMenuItem } from "@nuxt/ui"

import type { PermissionKey, RoleKey } from "@/shared/models/access"

/**
 * Sidebar navigation item owned by a feature module.
 *
 * @remarks
 * Extends {@link NavigationMenuItem} with RBAC metadata.
 * RBAC fields are removed before items are passed to `UNavigationMenu`.
 *
 * @example
 * ```ts
 * export const ordersNavigation: SidebarNavItem[] = [{
 *   label: "Orders",
 *   icon: "i-lucide-shopping-cart",
 *   to: { name: OrdersPageName.ORDERS_LIST },
 *   permissions: [Permission.ORDERS_READ],
 * }]
 * ```
 */
export type SidebarNavItem = NavigationMenuItem & {
  /**
   * Required permissions.
   * The user must have **all** listed permissions to see this item.
   */
  permissions?: PermissionKey[]

  /**
   * Alternative permission rule.
   * The user must have **at least one** listed permission to see this item.
   */
  permissionsAny?: PermissionKey[]

  /**
   * Required roles.
   * The user must have **at least one** listed role to see this item.
   */
  roles?: RoleKey[]

  /** Nested sidebar links rendered as a collapsible group. */
  children?: SidebarNavItem[]
}

/**
 * Logical sidebar section used by the central navigation registry.
 *
 * @remarks
 * Groups are flattened when rendered, but keep related feature menus organized
 * while the app grows.
 */
export type SidebarNavGroup = {
  /** Stable identifier for debugging and future grouping rules. */
  id: string
  /** Raw navigation items exported by one or more features. */
  items: SidebarNavItem[]
}
