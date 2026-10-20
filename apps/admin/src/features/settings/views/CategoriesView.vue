<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui"
import { useOverlay } from "@nuxt/ui/composables"
import { useQuery } from "@tanstack/vue-query"
import { computed } from "vue"

import { getPricingDefaults, productQueryKeys } from "@/features/products/services/api"
import { translate } from "@/plugins/language"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { formatNumber } from "@/shared/helpers/number"
import { Permission } from "@/shared/models/access"
import { useAccessStore } from "@/shared/stores/useAccessStore"

import CategoryFormModal from "../components/CategoryFormModal.vue"
import type { AdminCategory } from "../models"
import { getAdminCategories, settingsQueryKeys } from "../services/api"

/** Categories: name, card color, order, visibility, and (Owner) category markup. */
const accessStore = useAccessStore()
const formModal = useOverlay().create(CategoryFormModal)

const canManageMarkup = computed(() => accessStore.hasPermission(Permission.PRICES_MANAGE))

const categoriesQuery = useQuery({ queryKey: settingsQueryKeys.categories, queryFn: getAdminCategories, select: (response) => response.data ?? [] })
const pricingQuery = useQuery({ queryKey: productQueryKeys.pricingDefaults, queryFn: getPricingDefaults, enabled: canManageMarkup, select: (response) => response.data! })

const COLOR_CLASS = { red: "bg-[#D7192A]", yellow: "bg-[#FFD21F]", blue: "bg-[#1438C8]" } as const

const columns = computed<TableColumn<AdminCategory>[]>(() => [
  { accessorKey: "name", header: translate("features.settings.categories.table.category"), meta: { class: { td: "w-full max-w-0" } } },
  { accessorKey: "product_count", header: translate("features.settings.categories.table.products"), meta: { class: { th: "text-right", td: "text-right tabular-nums" } } },
  ...(canManageMarkup.value ? [{ accessorKey: "markup_percent", header: translate("features.settings.categories.table.markup") }] : []),
  { accessorKey: "sort_order", header: translate("features.settings.categories.table.order"), meta: { class: { th: "hidden sm:table-cell text-right", td: "hidden sm:table-cell text-right tabular-nums" } } },
  { accessorKey: "is_active", header: translate("features.settings.categories.table.status"), meta: { class: { th: "hidden sm:table-cell", td: "hidden sm:table-cell" } } },
  { id: "actions", meta: { class: { td: "w-px whitespace-nowrap" } } },
])

const open = (category: AdminCategory) => formModal.open({ category, canManageMarkup: canManageMarkup.value, globalMarkup: pricingQuery.data.value?.markup_percent })
</script>

<template>
  <UDashboardPanel id="categories">
    <template #header>
      <UDashboardNavbar :title="translate('features.settings.categories.page_title')" />
    </template>

    <template #body>
      <UAlert color="neutral" variant="subtle" icon="i-lucide-info" :description="translate('features.settings.categories.description')" class="shrink-0" />

      <QueryErrorAlert
        v-if="categoriesQuery.isError.value"
        :title="translate('features.settings.categories.load_error')"
        :error="categoriesQuery.error.value"
        @retry="categoriesQuery.refetch()"
      />

      <UTable v-else :data="categoriesQuery.data.value ?? []" :columns="columns" :loading="categoriesQuery.isFetching.value" :ui="{ td: 'py-3' }">
        <template #name-cell="{ row }">
          <div class="flex min-w-0 items-center gap-3">
            <span class="size-3 shrink-0 rounded-full border border-default" :class="row.original.color ? COLOR_CLASS[row.original.color] : 'bg-elevated'" />
            <div class="min-w-0">
              <p class="truncate font-medium text-highlighted">{{ row.original.name }}</p>
              <p class="truncate text-sm text-muted">/{{ row.original.slug }}</p>
            </div>
          </div>
        </template>

        <template #markup_percent-cell="{ row }">
          <span v-if="row.original.markup_percent !== null && row.original.markup_percent !== undefined" class="font-medium text-highlighted tabular-nums">
            {{ formatNumber(row.original.markup_percent, "id-ID", 2) }}%
          </span>
          <span v-else class="text-muted">{{ translate("features.settings.categories.table.markup_global") }}</span>
        </template>

        <template #is_active-cell="{ row }">
          <UBadge
            :label="row.original.is_active ? translate('features.settings.categories.table.active') : translate('features.settings.categories.table.inactive')"
            :color="row.original.is_active ? 'success' : 'neutral'"
            variant="subtle"
          />
        </template>

        <template #actions-cell="{ row }">
          <UButton :label="translate('features.settings.categories.edit')" icon="i-lucide-pencil" color="neutral" variant="ghost" size="sm" @click="open(row.original)" />
        </template>
      </UTable>
    </template>
  </UDashboardPanel>
</template>
