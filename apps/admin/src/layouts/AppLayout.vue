<script setup lang="ts">
import { ref } from "vue";

import { DashboardPageName } from "@/features/dashboard/models";
import { translate } from "@/plugins/language";
import { useDashboardSearchGroups } from "@/shared/composables/useDashboardSearchGroups";
import { useSidebarNavigation } from "@/shared/composables/useSidebarNavigation";
import AppSidebarFooter from "@/shared/components/AppSidebarFooter.vue";
import BrandLogo from "@/shared/components/BrandLogo.vue";

/** Display name shown next to the logo in the sidebar header. */
const APP_NAME = "Ortic Admin";

const isSidebarOpen = ref(false);
const { menu } = useSidebarNavigation();
const { groups } = useDashboardSearchGroups();

/**
 * Sidebar menu spacing: taller links with a gap between them and clearly spaced group labels.
 * A collapsed sidebar only shows icons, so its links stay narrow and centered.
 */
function navigationUi(collapsed: boolean) {
  return {
    list: "space-y-1",
    label: "px-3 pt-4 pb-1.5 text-xs font-medium text-dimmed",
    link: collapsed ? "justify-center px-2 py-2 before:rounded-lg" : "gap-3 px-3 py-2 before:rounded-lg",
    linkLeadingIcon: "size-5",
    childList: "mt-1 space-y-1 border-s border-default ms-5 ps-2",
    childLink: "gap-2.5 px-3 py-1.5 before:rounded-lg",
    separator: "my-3",
  };
}
</script>

<template>
  <UDashboardGroup unit="rem" storage="local" storage-key="dashboard_storage">
    <UDashboardSidebar
      v-model="isSidebarOpen"
      collapsible
      :default-size="17"
      :min-size="14"
      :max-size="22"
      :ui="{
        header: 'border-b border-default px-4',
        body: 'gap-5 px-3 py-4',
        footer: 'border-t border-default px-3 py-3',
      }"
    >
      <template #header="{ collapsed, collapse }">
        <!--
          Collapse toggle on the sidebar's edge, level with the header (desktop only; phones open the sidebar from
          the menu button in the page header). Replaces the toggle that used to sit in every page header.
        -->
        <UTooltip
          :text="translate(collapsed ? 'utils.navigation.expand_sidebar' : 'utils.navigation.collapse_sidebar')"
          :content="{ side: 'right' }"
        >
          <button
            type="button"
            class="absolute top-[calc(var(--ui-header-height)/2)] -right-3 z-20 hidden size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-default text-muted shadow-sm ring-1 ring-default transition-colors hover:bg-elevated hover:text-highlighted focus-visible:outline-2 focus-visible:outline-primary lg:flex"
            :aria-label="translate(collapsed ? 'utils.navigation.expand_sidebar' : 'utils.navigation.collapse_sidebar')"
            :aria-expanded="!collapsed"
            @click="collapse(!collapsed)"
          >
            <UIcon :name="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'" class="size-3.5" />
          </button>
        </UTooltip>

        <div class="flex w-full items-center gap-1.5" :class="collapsed ? 'justify-center' : 'justify-between'">
          <UTooltip v-if="collapsed" :text="APP_NAME">
            <RouterLink
              :to="{ name: DashboardPageName.DASHBOARD }"
              class="flex size-8 shrink-0 items-center justify-center rounded-md transition hover:bg-elevated"
              :aria-label="translate('utils.navigation.dashboard')"
            >
              <BrandLogo class="size-7" />
            </RouterLink>
          </UTooltip>

          <RouterLink
            v-else
            :to="{ name: DashboardPageName.DASHBOARD }"
            class="-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-elevated"
          >
            <BrandLogo class="size-8 shrink-0" />
            <span class="truncate font-semibold tracking-tight text-highlighted">
              {{ APP_NAME }}
            </span>
          </RouterLink>
        </div>
      </template>

      <template #default="{ collapsed }">
        <div data-tour="search">
          <UDashboardSearchButton
            block
            size="md"
            :collapsed="collapsed"
            class="rounded-lg! bg-transparent px-3 py-2 ring-default"
          />
        </div>
        <div data-tour="sidebar-menu">
          <UNavigationMenu
            :collapsed="collapsed"
            :items="menu"
            orientation="vertical"
            :ui="navigationUi(collapsed)"
          />
        </div>
      </template>

      <template #footer="{ collapsed }">
        <div data-tour="account" class="w-full">
          <AppSidebarFooter :collapsed="collapsed" />
        </div>
      </template>
    </UDashboardSidebar>

    <RouterView />

    <UDashboardSearch :groups="groups" />
  </UDashboardGroup>
</template>
