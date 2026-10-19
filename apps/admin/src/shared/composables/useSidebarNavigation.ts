import type { NavigationMenuItem } from "@nuxt/ui"
import { computed } from "vue"

import { filterNavigationItems } from "@/shared/navigation/filter-navigation"
import { contextualNavigationGroups, sidebarNavigationGroups } from "@/shared/navigation/registry"
import { useAccessStore } from "@/shared/stores/useAccessStore"

/**
 * Builds the sidebar menu for `UNavigationMenu`.
 *
 * @returns Reactive sidebar items filtered by the current user's access.
 *
 * @remarks
 * Reads the central navigation registry (contextual groups for the current route first) and filters it through
 * {@link useAccessStore}. Recomputed automatically when permissions or roles change.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { menu } = useSidebarNavigation()
 * </script>
 *
 * <template>
 *   <UNavigationMenu :items="menu" orientation="vertical" />
 * </template>
 * ```
 */
export function useSidebarNavigation() {
  const accessStore = useAccessStore()
  const contextualGroups = contextualNavigationGroups.map((group) => group.useItems())

  const access = computed(() => ({
    permissions: accessStore.permissionSet,
    roles: accessStore.roleSet,
  }))

  /** Static menu items, flattened (also used by the dashboard search). */
  const items = computed<NavigationMenuItem[]>(() =>
    sidebarNavigationGroups.flatMap((group) => filterNavigationItems(group.items, access.value)),
  )

  /** Items of the route-dependent groups, e.g. the editor menu while an invitation is open. */
  const contextualItems = computed<NavigationMenuItem[]>(() =>
    contextualGroups.flatMap((groupItems) => filterNavigationItems(groupItems.value, access.value)),
  )

  /** Sidebar menu: contextual items first, separated from the static menu. Pass to `UNavigationMenu`. */
  const menu = computed<NavigationMenuItem[][]>(() =>
    [contextualItems.value, items.value].filter((group) => group.length > 0),
  )

  return {
    items,
    menu,
  }
}
