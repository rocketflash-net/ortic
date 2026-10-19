import "vue-router"

import type { PermissionKey, RoleKey } from "@/shared/models/access"

declare module "vue-router" {
  interface RouteMeta {
    /**
     * Required permissions for route access.
     * The user must have **all** listed permissions.
     */
    permissions?: PermissionKey[]

    /**
     * Alternative permission rule for route access.
     * The user must have **at least one** listed permission.
     */
    permissionsAny?: PermissionKey[]

    /**
     * Required roles for route access.
     * The user must have **at least one** listed role.
     */
    roles?: RoleKey[]

    /**
     * Route needs a signed-in user; set on a parent to protect every child.
     * Without a session the user is sent to the login page and returned afterwards.
     */
    requiresAuth?: boolean

    /** Route is only for signed-out users (login); signed-in users are sent to the dashboard. */
    guestOnly?: boolean
  }
}
