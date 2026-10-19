import type { NavigationGuard, RouteLocationNormalized } from "vue-router"

import { UtilsPageName } from "@/shared/models"
import type { PermissionKey, RoleKey } from "@/shared/models/access"
import type { AccessContext } from "@/shared/navigation/filter-navigation"
import { hasNavItemAccess } from "@/shared/navigation/filter-navigation"
import type { SidebarNavItem } from "@/shared/navigation/types"
import { useAccessStore } from "@/shared/stores/useAccessStore"

/**
 * RBAC metadata extracted from vue-router route records.
 */
type RouteAccessMeta = {
  permissions?: PermissionKey[]
  permissionsAny?: PermissionKey[]
  roles?: RoleKey[]
}

/**
 * Reads RBAC metadata from the matched route chain.
 *
 * @param route - Target route resolved by vue-router.
 * @returns The most specific RBAC meta found in the matched records.
 *
 * @remarks
 * Matched records are scanned from leaf to root so child routes can override
 * parent layout rules when needed.
 */
export function getRouteAccessMeta(route: RouteLocationNormalized): RouteAccessMeta {
  const matchedMeta = route.matched
    .map((record) => record.meta)
    .reverse()

  return {
    permissions: matchedMeta.find((meta) => meta.permissions)?.permissions as
      | PermissionKey[]
      | undefined,
    permissionsAny: matchedMeta.find((meta) => meta.permissionsAny)?.permissionsAny as
      | PermissionKey[]
      | undefined,
    roles: matchedMeta.find((meta) => meta.roles)?.roles as RoleKey[] | undefined,
  }
}

/**
 * Determines whether the current user may navigate to a route.
 *
 * @param route - Target route resolved by vue-router.
 * @param access - Current permission and role context.
 * @returns `true` when navigation should be allowed.
 *
 * @remarks
 * Uses the same RBAC evaluation rules as sidebar filtering via {@link hasNavItemAccess}.
 *
 * @example
 * ```ts
 * router.beforeEach((to) => {
 *   const accessStore = useAccessStore()
 *
 *   if (!canAccessRoute(to, {
 *     permissions: accessStore.permissionSet,
 *     roles: accessStore.roleSet,
 *   })) {
 *     return { name: UtilsPageName.FORBIDDEN }
 *   }
 * })
 * ```
 */
export function canAccessRoute(route: RouteLocationNormalized, access: AccessContext): boolean {
  const meta = getRouteAccessMeta(route)

  return hasNavItemAccess(meta as SidebarNavItem, access)
}

/**
 * Global RBAC guard: signed-in pages whose `meta.permissions` / `permissionsAny` / `roles` the user lacks
 * show the Forbidden page. Runs after the authentication guard, so access data is already loaded.
 */
export const accessGuard: NavigationGuard = (to) => {
  if (!to.matched.some((record) => record.meta.requiresAuth)) return true

  const accessStore = useAccessStore()
  return canAccessRoute(to, { permissions: accessStore.permissionSet, roles: accessStore.roleSet }) || { name: UtilsPageName.FORBIDDEN }
}
