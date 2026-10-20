<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from "@nuxt/ui"
import { useOverlay } from "@nuxt/ui/composables"
import { keepPreviousData, useQuery } from "@tanstack/vue-query"
import { computed, watch } from "vue"

import { useAuthStore } from "@/features/authentication/stores/authentication.store"
import { getCategories, productQueryKeys } from "@/features/products/services/api"
import { getWarehouses, warehouseQueryKeys } from "@/features/warehouses/services/api"
import { translate } from "@/plugins/language"
import DataTablePagination from "@/shared/components/DataTablePagination.vue"
import DataTableToolbar from "@/shared/components/DataTableToolbar.vue"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import SearchInput from "@/shared/components/SearchInput.vue"
import { useDebouncedQueryModel, useRouteQueryState } from "@/shared/composables/useRouteQueryState"
import { formatNumber } from "@/shared/helpers/number"
import { integerParam, literalParam, paginationParams, stringParam } from "@/shared/helpers/query-param"

import StockAdjustModal from "../components/StockAdjustModal.vue"
import StockCardSlideover from "../components/StockCardSlideover.vue"
import StockThresholdModal from "../components/StockThresholdModal.vue"
import StockTransferModal from "../components/StockTransferModal.vue"
import { STOCK_LEVELS, type StockLevel, type StockListParams } from "../models"
import { getStocks, stockQueryKeys } from "../services/api"

/**
 * Stock per warehouse with stock in, stock count, transfers, low-stock thresholds, and the stock card.
 *
 * @remarks
 * Filters live in the URL (`warehouse_id`, `level`, `search`, `category`), so dashboard and notification links such as
 * `/stocks?level=low` open the right view. Staf tied to one warehouse only see that warehouse.
 */
const authStore = useAuthStore()
const overlay = useOverlay()
const adjustModal = overlay.create(StockAdjustModal)
const transferModal = overlay.create(StockTransferModal)
const thresholdModal = overlay.create(StockThresholdModal)
const cardSlideover = overlay.create(StockCardSlideover)

const {
  page,
  limit,
  search,
  level,
  warehouse_id: warehouseParam,
  category,
} = useRouteQueryState(
  {
    ...paginationParams(),
    search: stringParam({ maxLength: 100 }),
    level: literalParam(STOCK_LEVELS, "all"),
    warehouse_id: integerParam({ default: 0, min: 0 }),
    category: integerParam({ default: 0, min: 0 }),
  },
  { resetKey: "page" },
)
const searchInput = useDebouncedQueryModel(search)

const ownWarehouseId = computed(() => authStore.userData?.warehouseId ?? null)

const warehousesQuery = useQuery({ queryKey: warehouseQueryKeys.all, queryFn: getWarehouses, select: (response) => response.data ?? [] })
const categoriesQuery = useQuery({ queryKey: productQueryKeys.categories, queryFn: getCategories, select: (response) => response.data ?? [] })

const warehouses = computed(() => warehousesQuery.data.value ?? [])
const warehouseItems = computed(() =>
  warehouses.value
    .filter((warehouse) => !ownWarehouseId.value || warehouse.id === ownWarehouseId.value)
    .map((warehouse) => ({ label: warehouse.is_active ? warehouse.name : `${warehouse.name} (nonaktif)`, value: warehouse.id })),
)
const categoryItems = computed(() => [
  { label: translate("features.stocks.filters.all_categories"), value: 0 },
  ...(categoriesQuery.data.value ?? []).map((item) => ({ label: item.name, value: item.id })),
])
const levelItems = computed(() => STOCK_LEVELS.map((value) => ({ label: translate(`features.stocks.levels.${value}`), value })))

const listParams = computed<StockListParams>(() => ({
  page: page.value,
  limit: limit.value,
  warehouse_id: ownWarehouseId.value ?? (warehouseParam.value || undefined),
  search: search.value,
  category_id: category.value || undefined,
  level: level.value,
}))

const { data: stockPage, isFetching, error, refetch } = useQuery({
  queryKey: computed(() => stockQueryKeys.list(listParams.value)),
  queryFn: () => getStocks(listParams.value),
  placeholderData: keepPreviousData,
})

/** Warehouse the API resolved (the default one when none is chosen yet). */
const currentWarehouseId = computed(() => stockPage.value?.additionalInfo.warehouse_id ?? listParams.value.warehouse_id ?? 0)

// Show the resolved warehouse in the picker without writing the default into the URL.
const selectedWarehouse = computed({
  get: () => currentWarehouseId.value || undefined,
  set: (value: number | undefined) => {
    warehouseParam.value = value ?? 0
  },
})

watch(ownWarehouseId, (id) => {
  if (id && warehouseParam.value && warehouseParam.value !== id) warehouseParam.value = 0
})

const LEVEL_COLOR = { ok: "success", low: "warning", out: "error" } as const

const rowActions = (stock: StockLevel): DropdownMenuItem[][] => {
  const base = { stock, warehouseId: currentWarehouseId.value }
  return [
    [
      { label: translate("features.stocks.actions.stock_in"), icon: "i-lucide-package-plus", onSelect: () => adjustModal.open({ ...base, type: "stock_in" }) },
      { label: translate("features.stocks.actions.adjustment"), icon: "i-lucide-clipboard-check", onSelect: () => adjustModal.open({ ...base, type: "adjustment" }) },
      ...(ownWarehouseId.value
        ? []
        : [{ label: translate("features.stocks.actions.transfer"), icon: "i-lucide-arrow-left-right", disabled: stock.available <= 0, onSelect: () => transferModal.open({ ...base, warehouses: warehouses.value }) }]),
    ],
    [
      { label: translate("features.stocks.actions.threshold"), icon: "i-lucide-bell-ring", onSelect: () => thresholdModal.open(base) },
      {
        label: translate("features.stocks.actions.card"),
        icon: "i-lucide-scroll-text",
        onSelect: () => cardSlideover.open({ ...base, warehouses: warehouses.value, lockWarehouse: Boolean(ownWarehouseId.value) }),
      },
    ],
  ]
}

const columns: TableColumn<StockLevel>[] = [
  { accessorKey: "product_name", header: translate("features.stocks.table.product"), meta: { class: { td: "w-full max-w-0" } } },
  { accessorKey: "quantity", header: translate("features.stocks.table.quantity"), meta: { class: { th: "hidden md:table-cell text-right", td: "hidden md:table-cell text-right tabular-nums" } } },
  { accessorKey: "reserved", header: translate("features.stocks.table.reserved"), meta: { class: { th: "hidden md:table-cell text-right", td: "hidden md:table-cell text-right tabular-nums" } } },
  { accessorKey: "available", header: translate("features.stocks.table.available"), meta: { class: { th: "text-right", td: "text-right tabular-nums" } } },
  { accessorKey: "low_stock_threshold", header: translate("features.stocks.table.threshold"), meta: { class: { th: "hidden lg:table-cell text-right", td: "hidden lg:table-cell text-right tabular-nums" } } },
  { accessorKey: "level", header: translate("features.stocks.table.level"), meta: { class: { th: "hidden sm:table-cell", td: "hidden sm:table-cell" } } },
  { id: "actions", meta: { class: { td: "w-px" } } },
]

const hasFilters = computed(() => Boolean(search.value) || level.value !== "all" || category.value !== 0)
const clearFilters = () => {
  search.value = ""
  level.value = "all"
  category.value = 0
}
</script>

<template>
  <UDashboardPanel id="stocks">
    <template #header>
      <UDashboardNavbar :title="translate('features.stocks.page_title')" />

      <DataTableToolbar>
        <SearchInput v-model="searchInput" :placeholder="translate('features.stocks.filters.search_placeholder')" />
        <template #filters>
          <div class="w-52 shrink-0">
            <USelect
              v-model="selectedWarehouse"
              :items="warehouseItems"
              :disabled="Boolean(ownWarehouseId)"
              :loading="warehousesQuery.isPending.value"
              :aria-label="translate('features.stocks.warehouse')"
              icon="i-lucide-warehouse"
              class="w-full"
            />
          </div>
          <div class="w-52 shrink-0"><USelect v-model="category" :items="categoryItems" class="w-full" /></div>
          <UTabs v-model="level" :items="levelItems" :content="false" size="sm" class="shrink-0" />
        </template>
      </DataTableToolbar>
    </template>

    <template #body>
      <UAlert color="neutral" variant="subtle" icon="i-lucide-info" :description="translate('features.stocks.description')" class="shrink-0" />
      <UAlert v-if="ownWarehouseId" color="neutral" variant="outline" icon="i-lucide-lock" :description="translate('features.stocks.own_warehouse')" class="shrink-0" />

      <QueryErrorAlert v-if="error" :title="translate('features.stocks.load_error')" :error="error" @retry="refetch()" />

      <UTable v-else :data="stockPage?.data ?? []" :columns="columns" :loading="isFetching" sticky="header" class="flex-1" :ui="{ td: 'py-3' }">
        <template #product_name-cell="{ row }">
          <div class="flex min-w-0 items-center gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-default bg-elevated">
              <img v-if="row.original.image_url" :src="row.original.image_url" :alt="row.original.product_name" class="size-full object-contain" loading="lazy" />
              <UIcon v-else name="i-lucide-image" class="size-4 text-dimmed" />
            </div>
            <div class="min-w-0">
              <p class="truncate font-medium text-highlighted">{{ row.original.product_name }}</p>
              <p class="truncate text-sm text-muted">
                {{ [row.original.variant_name, row.original.sku].filter(Boolean).join(" · ") }}
                <UBadge v-if="!row.original.is_active" :label="translate('features.stocks.table.inactive')" color="neutral" variant="outline" size="sm" class="ms-1" />
              </p>
              <p class="text-sm text-toned md:hidden">
                {{ translate("features.stocks.table.quantity") }} {{ formatNumber(row.original.quantity) }} · {{ translate("features.stocks.table.reserved") }}
                {{ formatNumber(row.original.reserved) }}
              </p>
            </div>
          </div>
        </template>

        <template #available-cell="{ row }">
          <span class="font-semibold" :class="row.original.level === 'ok' ? 'text-highlighted' : row.original.level === 'low' ? 'text-warning' : 'text-error'">
            {{ formatNumber(row.original.available) }}
          </span>
        </template>

        <template #level-cell="{ row }">
          <UBadge :label="translate(`features.stocks.levels.${row.original.level}`)" :color="LEVEL_COLOR[row.original.level]" variant="subtle" />
        </template>

        <template #actions-cell="{ row }">
          <UDropdownMenu :items="rowActions(row.original)" :content="{ align: 'end' }">
            <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="sm" :aria-label="translate('features.stocks.actions.menu')" />
          </UDropdownMenu>
        </template>

        <template #empty>
          <UEmpty
            icon="i-lucide-boxes"
            :title="translate('features.stocks.table.empty_title')"
            :description="translate('features.stocks.table.empty_description')"
            :actions="hasFilters ? [{ label: translate('utils.common.clear_filters'), icon: 'i-lucide-x', color: 'neutral', variant: 'subtle', onClick: clearFilters }] : []"
            variant="naked"
          />
        </template>
      </UTable>

      <DataTablePagination v-if="!error" v-model:page="page" v-model:limit="limit" :total="stockPage?.additionalInfo.pagination.total ?? 0" />
    </template>
  </UDashboardPanel>
</template>
