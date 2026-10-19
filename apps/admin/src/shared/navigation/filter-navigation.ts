import type { NavigationMenuItem } from "@nuxt/ui"

import type { PermissionKey, RoleKey } from "@/shared/models/access"

import type { SidebarNavItem } from "./types"

/**
 * Current access state used to evaluate navigation and route visibility.
 */
export type AccessContext = {
  /** Permission keys currently held by the signed-in user. */
  permissions: ReadonlySet<PermissionKey>
  /** Role keys currently held by the signed-in user. */
  roles: ReadonlySet<RoleKey>
}

/**
 * Checks whether the current user can access a navigation item or route meta rule.
 *
 * @param item - Navigation item or route meta containing RBAC fields.
 * @param access - Current permission and role context.
 * @returns `true` when the item should be visible/accessible.
 *
 * @remarks
 * Evaluation order:
 * 1. `roles` — at least one role must match when defined.
 * 2. `permissionsAny` — at least one permission must match when defined.
 * 3. `permissions` — every permission must match when defined.
 * 4. If no RBAC fields are defined, access is granted.
 */
export function hasNavItemAccess(item: SidebarNavItem, access: AccessContext): boolean {
  if (item.roles?.length && !item.roles.some((role) => access.roles.has(role))) {
    return false
  }

  if (
    item.permissionsAny?.length
    && !item.permissionsAny.some((permission) => access.permissions.has(permission))
  ) {
    return false
  }

  if (
    item.permissions?.length
    && !item.permissions.every((permission) => access.permissions.has(permission))
  ) {
    return false
  }

  return true
}

/**
 * Removes RBAC metadata before passing items to Nuxt UI navigation components.
 *
 * @param item - Sidebar item containing RBAC metadata.
 * @returns A plain {@link NavigationMenuItem}.
 */
function stripAccessMeta(item: SidebarNavItem): NavigationMenuItem {
  const { permissions: _permissions, permissionsAny: _permissionsAny, roles: _roles, children, ...navItem } =
    item

  return {
    ...navItem,
    children: children?.map(stripAccessMeta),
  }
}

/**
 * Recursively filters a single sidebar item and its children.
 *
 * @param item - Sidebar item to evaluate.
 * @param access - Current permission and role context.
 * @returns A sanitized navigation item, or `null` when access is denied.
 */
function filterNavItem(item: SidebarNavItem, access: AccessContext): NavigationMenuItem | null {
  if (item.type === "label") {
    return stripAccessMeta(item)
  }

  const filteredChildren = item.children
    ?.map((child) => filterNavItem(child, access))
    .filter((child): child is NavigationMenuItem => child !== null)

  const accessibleItem: SidebarNavItem = {
    ...item,
    children: filteredChildren,
  }

  if (!hasNavItemAccess(accessibleItem, access)) {
    return null
  }

  if (accessibleItem.children?.length === 0) {
    return null
  }

  return stripAccessMeta(accessibleItem)
}

/**
 * Filters a flat or nested sidebar list based on the current user's access.
 *
 * @param items - Raw sidebar items from feature modules or the registry.
 * @param access - Current permission and role context.
 * @returns Navigation items safe to pass into `UNavigationMenu`.
 *
 * @remarks
 * Section labels (`type: "label"`) are removed automatically when no visible
 * items follow them, preventing empty groups in the sidebar.
 */
export function filterNavigationItems(
  items: SidebarNavItem[],
  access: AccessContext,
): NavigationMenuItem[] {
  const filtered = items
    .map((item) => filterNavItem(item, access))
    .filter((item): item is NavigationMenuItem => item !== null)

  return filtered.filter((item, index, array) => {
    if (item.type !== "label") {
      return true
    }

    const nextItem = array[index + 1]
    return Boolean(nextItem && nextItem.type !== "label")
  })
}
