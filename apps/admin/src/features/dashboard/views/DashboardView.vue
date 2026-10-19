<script setup lang="ts">
import { storeToRefs } from "pinia"
import { computed } from "vue"

import { useAuthStore } from "@/features/authentication/stores/authentication.store"
import { WarehousesPageName } from "@/features/warehouses/models"
import { translate } from "@/plugins/language"

/**
 * Admin home. Fase 1 shows a welcome and what is ready; order counters arrive with the orders feature (Fase 2).
 */
const { userData } = storeToRefs(useAuthStore())

const firstName = computed(() => userData.value?.name.trim().split(/\s+/)[0])

const steps = [
  { icon: "i-lucide-warehouse", key: "warehouses", to: { name: WarehousesPageName.WAREHOUSES } },
  { icon: "i-lucide-package", key: "products", to: undefined },
  { icon: "i-lucide-shopping-bag", key: "orders", to: undefined },
] as const
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar :title="translate('features.dashboard.page_title')" />
    </template>

    <template #body>
      <section class="relative overflow-hidden rounded-xl bg-ortic-blue p-6 text-white sm:p-8">
        <div class="flex gap-1.5" aria-hidden="true">
          <span class="h-1.5 w-10 rounded-full bg-ortic-red" />
          <span class="h-1.5 w-10 rounded-full bg-ortic-yellow" />
          <span class="h-1.5 w-10 rounded-full bg-white" />
        </div>
        <h1 class="mt-4 font-display text-4xl tracking-wide sm:text-5xl">
          {{ firstName ? translate("features.dashboard.welcome.title_named", { name: firstName }) : translate("features.dashboard.welcome.title") }}
        </h1>
        <p class="mt-2 max-w-xl text-white/85">{{ translate("features.dashboard.welcome.description") }}</p>
      </section>

      <div class="grid gap-4 sm:grid-cols-3">
        <UCard v-for="step in steps" :key="step.key">
          <div class="flex items-start gap-3">
            <UIcon :name="step.icon" class="size-6 shrink-0 text-primary" />
            <div class="min-w-0">
              <p class="font-semibold text-highlighted">{{ translate(`features.dashboard.steps.${step.key}.title`) }}</p>
              <p class="mt-1 text-sm text-muted">{{ translate(`features.dashboard.steps.${step.key}.description`) }}</p>
              <UButton
                v-if="step.to"
                :to="step.to"
                :label="translate('features.dashboard.open')"
                variant="link"
                size="sm"
                trailing-icon="i-lucide-arrow-right"
                class="mt-2 px-0"
              />
              <UBadge v-else :label="translate('features.dashboard.coming_soon')" color="neutral" variant="subtle" class="mt-3" />
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
