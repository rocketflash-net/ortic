import type { CommandPaletteGroup, CommandPaletteItem, NavigationMenuItem } from "@nuxt/ui"
import { computed } from "vue"

import { useSidebarNavigation } from "@/shared/composables/useSidebarNavigation"

/**
 * Flattens sidebar navigation into command-palette searchable links.
 *
 * @param items - Filtered navigation items from {@link useSidebarNavigation}.
 */
function flattenNavItems(items: NavigationMenuItem[]): CommandPaletteItem[] {
  return items.flatMap((item) => {
    if (item.type === "label" || !item.label) {
      return []
    }

    const childItems = item.children ? flattenNavItems(item.children) : []

    if (!item.to && !item.href) {
      return childItems
    }

    return [
      {
        label: item.label,
        icon: item.icon,
        to: item.to,
      },
      ...childItems,
    ]
  })
}

/**
 * Builds command palette groups for {@link UDashboardSearch}.
 *
 * @returns Search groups derived from the current user's visible sidebar routes.
 */
export function useDashboardSearchGroups() {
  const { items } = useSidebarNavigation()

  const groups = computed<CommandPaletteGroup[]>(() => [
    {
      id: "navigation",
      label: "Go to",
      items: flattenNavItems(items.value),
    },
  ])

  return {
    groups,
  }
}
