import { computed, ref } from "vue"
import { defineStore } from "pinia"

import type { AccessProfile, PermissionKey, RoleKey } from "@/shared/models/access"

/**
 * Pinia store for roles and permissions returned by the backend.
 *
 * @remarks
 * This store is the single source of truth for RBAC state in the frontend.
 * Hydrate it after login or during app bootstrap, then consume it from
 * {@link useSidebarNavigation} and router guards.
 *
 * @example
 * ```ts
 * const accessStore = useAccessStore()
 *
 * const { data } = await axios.get<AccessProfile>("/me")
 * accessStore.setAccess(data)
 * ```
 */
export const useAccessStore = defineStore("access", () => {
  /** Role keys currently assigned to the signed-in user (filled from `GET /auth/me`). */
  const roles = ref<RoleKey[]>([])

  /** Permission keys currently assigned to the signed-in user (filled from `GET /auth/me`). */
  const permissions = ref<PermissionKey[]>([])

  /** Whether access data has been hydrated from the backend. */
  const isLoaded = ref(false)

  /** Permission lookup optimized for frequent RBAC checks. */
  const permissionSet = computed(() => new Set(permissions.value))

  /** Role lookup optimized for frequent RBAC checks. */
  const roleSet = computed(() => new Set(roles.value))

  /**
   * Checks whether the user has a specific permission.
   *
   * @param permission - Permission key to evaluate.
   */
  function hasPermission(permission: PermissionKey): boolean {
    return permissionSet.value.has(permission)
  }

  /**
   * Checks whether the user has at least one permission from a list.
   *
   * @param required - Permission keys to evaluate.
   */
  function hasAnyPermission(required: PermissionKey[]): boolean {
    return required.some((permission) => permissionSet.value.has(permission))
  }

  /**
   * Checks whether the user has every permission from a list.
   *
   * @param required - Permission keys to evaluate.
   */
  function hasAllPermissions(required: PermissionKey[]): boolean {
    return required.every((permission) => permissionSet.value.has(permission))
  }

  /**
   * Checks whether the user has a specific role.
   *
   * @param role - Role key to evaluate.
   */
  function hasRole(role: RoleKey): boolean {
    return roleSet.value.has(role)
  }

  /**
   * Replaces the current access state with backend data.
   *
   * @param profile - Roles and permissions returned by the auth API.
   */
  function setAccess(profile: AccessProfile) {
    roles.value = profile.roles
    permissions.value = profile.permissions
    isLoaded.value = true
  }

  /** Clears all access state, typically during logout. */
  function clearAccess() {
    roles.value = []
    permissions.value = []
    isLoaded.value = false
  }

  return {
    roles,
    permissions,
    isLoaded,
    permissionSet,
    roleSet,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    setAccess,
    clearAccess,
  }
})
