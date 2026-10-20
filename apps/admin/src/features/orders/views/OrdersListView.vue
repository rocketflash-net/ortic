<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui"
import { ORDER_STATUS_LABELS } from "@ortic/shared"
import { keepPreviousData, useQuery } from "@tanstack/vue-query"
import { computed } from "vue"
import { useRouter } from "vue-router"

import { getWarehouses, warehouseQueryKeys } from "@/features/warehouses/services/api"
import { translate } from "@/plugins/language"
import DataTablePagination from "@/shared/components/DataTablePagination.vue"
import DataTableToolbar from "@/shared/components/DataTableToolbar.vue"
import DateRangeFilter from "@/shared/components/DateRangeFilter.vue"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import SearchInput from "@/shared/components/SearchInput.vue"
import { useDateFormatter } from "@/shared/composables/useDateFormatter"
import { useDebouncedQueryModel, useRouteQueryState } from "@/shared/composables/useRouteQueryState"
import { formatCurrency } from "@/shared/helpers/number"
import { integerParam, literalParam, paginationParams, stringParam } from "@/shared/helpers/query-param"

import { ORDER_STATUS_COLOR, ORDER_STATUS_FILTERS, OrdersPageName, type AdminOrderListItem, type AdminOrderListParams } from "../models"
import { getOrders, orderQueryKeys } from "../services/api"

/**
 * Order list: status tabs with counts, warehouse & date filters, and search (code, recipient, phone, waybill, email).
 * Every filter lives in the URL so dashboard cards can link to a pre-filtered list.
 */
const router = useRouter()
const { formatDateTime } = useDateFormatter()

const ALL = "all" as const
// "to_ship" groups the two statuses that still wait for the courier (dashboard card "Siap dikirim").
const TO_SHIP = "to_ship" as const
const STATUS_GROUPS: Record<string, string> = { [TO_SHIP]: "processing,awaiting_pickup" }

const {
  page,
  limit,
  q: search,
  status,
  warehouse,
  refund,
  from,
  to,
} = useRouteQueryState(
  {
    ...paginationParams(),
    q: stringParam({ maxLength: 100 }),
    status: literalParam([ALL, TO_SHIP, ...ORDER_STATUS_FILTERS], ALL),
    warehouse: integerParam({ default: 0, min: 0 }),
    // Dashboard card "Refund tertunda" links here with ?refund=pending.
    refund: literalParam(["", "pending", "refunded"] as const, ""),
    from: stringParam({ maxLength: 10, pattern: /^\d{4}-\d{2}-\d{2}$/ }),
    to: stringParam({ maxLength: 10, pattern: /^\d{4}-\d{2}-\d{2}$/ }),
  },
  { resetKey: "page" },
)
const searchInput = useDebouncedQueryModel(search)

const listParams = computed<AdminOrderListParams>(() => ({
  page: page.value,
  limit: limit.value,
  search: search.value,
  status: status.value === ALL ? undefined : (STATUS_GROUPS[status.value] ?? status.value),
  warehouse_id: warehouse.value || undefined,
  refund_status: refund.value || undefined,
  date_from: from.value || undefined,
  date_to: to.value || undefined,
}))

const { data: orderPage, isFetching, error, refetch } = useQuery({
  queryKey: computed(() => orderQueryKeys.list(listParams.value)),
  queryFn: () => getOrders(listParams.value),
  placeholderData: keepPreviousData,
})

const warehousesQuery = useQuery({ queryKey: warehouseQueryKeys.all, queryFn: getWarehouses, select: (response) => response.data ?? [] })
const warehouseItems = computed(() => [
  { label: translate("features.orders.filters.all_warehouses"), value: 0 },
  ...(warehousesQuery.data.value ?? []).map((item) => ({ label: item.name, value: item.id })),
])
const warehouseName = (id: number) => warehousesQuery.data.value?.find((item) => item.id === id)?.code ?? ""

const counts = computed(() => orderPage.value?.additionalInfo.status_counts ?? {})
type StatusFilter = typeof status.value
const statusTabs = computed<{ value: StatusFilter; label: string; count: number }[]>(() => [
  { value: ALL, label: translate("features.orders.filters.all_statuses"), count: Object.values(counts.value).reduce((sum, value) => sum + (value ?? 0), 0) },
  ...(status.value === TO_SHIP ? [{ value: TO_SHIP, label: `${ORDER_STATUS_LABELS.processing} + ${ORDER_STATUS_LABELS.awaiting_pickup}`, count: (counts.value.processing ?? 0) + (counts.value.awaiting_pickup ?? 0) }] : []),
  ...ORDER_STATUS_FILTERS.map((value) => ({ value, label: ORDER_STATUS_LABELS[value], count: counts.value[value] ?? 0 })),
])

const openOrder = (order: AdminOrderListItem) => router.push({ name: OrdersPageName.ORDER_DETAIL, params: { code: order.code } })

const columns: TableColumn<AdminOrderListItem>[] = [
  { accessorKey: "code", header: translate("features.orders.table.order") },
  { accessorKey: "buyer", header: translate("features.orders.table.buyer"), meta: { class: { td: "w-full max-w-0" } } },
  { accessorKey: "courier", header: translate("features.orders.table.shipping"), meta: { class: { th: "hidden lg:table-cell", td: "hidden lg:table-cell" } } },
  { accessorKey: "status", header: translate("features.orders.table.status") },
  { accessorKey: "total", header: translate("features.orders.table.total"), meta: { class: { th: "hidden sm:table-cell text-right", td: "hidden sm:table-cell text-right" } } },
]

const hasFilters = computed(() => Boolean(search.value) || status.value !== ALL || warehouse.value !== 0 || Boolean(refund.value) || Boolean(from.value || to.value))
const clearFilters = () => {
  search.value = ""
  status.value = ALL
  warehouse.value = 0
  refund.value = ""
  from.value = ""
  to.value = ""
}
</script>

<template>
  <UDashboardPanel id="orders">
    <template #header>
      <UDashboardNavbar :title="translate('features.orders.page_title')" />

      <DataTableToolbar>
        <SearchInput v-model="searchInput" :placeholder="translate('features.orders.filters.search_placeholder')" />
        <template #filters>
          <div v-if="warehouseItems.length > 2" class="w-48 shrink-0"><USelect v-model="warehouse" :items="warehouseItems" class="w-full" /></div>
          <DateRangeFilter v-model:from="from" v-model:to="to" />
        </template>
      </DataTableToolbar>

      <div class="flex gap-1.5 overflow-x-auto border-b border-default px-4 py-2 sm:px-6">
        <UButton
          v-for="tab in statusTabs"
          :key="tab.value"
          :label="tab.label"
          size="sm"
          :color="status === tab.value ? 'primary' : 'neutral'"
          :variant="status === tab.value ? 'soft' : 'ghost'"
          class="shrink-0"
          @click="status = tab.value"
        >
          <template #trailing>
            <UBadge v-if="tab.count" :label="String(tab.count)" size="sm" :color="status === tab.value ? 'primary' : 'neutral'" variant="subtle" />
          </template>
        </UButton>
      </div>
    </template>

    <template #body>
      <QueryErrorAlert v-if="error" :title="translate('features.orders.load_error')" :error="error" @retry="refetch()" />

      <UTable
        v-else
        :data="orderPage?.data ?? []"
        :columns="columns"
        :loading="isFetching"
        sticky="header"
        class="flex-1"
        :ui="{ td: 'py-3', tr: 'cursor-pointer' }"
        @select="(_event, row) => openOrder(row.original)"
      >
        <template #code-cell="{ row }">
          <p class="font-medium whitespace-nowrap text-highlighted tabular-nums">{{ row.original.code }}</p>
          <p class="text-sm whitespace-nowrap text-muted">{{ formatDateTime(row.original.created_at) }}</p>
        </template>

        <template #buyer-cell="{ row }">
          <p class="truncate text-toned">{{ row.original.recipient_name }} · {{ row.original.city }}</p>
          <p class="truncate text-sm text-muted">
            {{ [row.original.buyer.email, translate("features.orders.table.items", { count: row.original.item_count })].join(" · ") }}
          </p>
          <p class="truncate text-sm text-toned sm:hidden">{{ formatCurrency(row.original.total) }}</p>
        </template>

        <template #courier-cell="{ row }">
          <p class="whitespace-nowrap text-toned">
            {{ row.original.courier }}
            <UBadge v-if="warehouseName(row.original.warehouse_id)" :label="warehouseName(row.original.warehouse_id)" size="sm" color="neutral" variant="outline" class="ms-1" />
          </p>
          <p v-if="row.original.shipment_error" class="flex items-center gap-1 text-sm text-error">
            <UIcon name="i-lucide-triangle-alert" class="size-4" />{{ translate("features.orders.table.booking_failed") }}
          </p>
          <p v-else class="text-sm whitespace-nowrap text-muted tabular-nums">{{ row.original.waybill_id ?? translate("features.orders.table.no_waybill") }}</p>
        </template>

        <template #status-cell="{ row }">
          <div class="flex flex-col items-start gap-1">
            <UBadge :label="ORDER_STATUS_LABELS[row.original.status]" :color="ORDER_STATUS_COLOR[row.original.status]" variant="subtle" class="whitespace-nowrap" />
            <UBadge
              v-if="row.original.refund_status !== 'none'"
              :label="translate(`features.orders.refund_status.${row.original.refund_status}`)"
              :color="row.original.refund_status === 'pending' ? 'warning' : 'neutral'"
              variant="outline"
              size="sm"
              class="whitespace-nowrap"
            />
          </div>
        </template>

        <template #total-cell="{ row }">
          <span class="whitespace-nowrap text-toned tabular-nums">{{ formatCurrency(row.original.total) }}</span>
        </template>

        <template #empty>
          <UEmpty
            icon="i-lucide-shopping-bag"
            :title="translate('features.orders.table.empty_title')"
            :description="translate('features.orders.table.empty_description')"
            :actions="hasFilters ? [{ label: translate('utils.common.clear_filters'), icon: 'i-lucide-x', color: 'neutral', variant: 'subtle', onClick: clearFilters }] : []"
            variant="naked"
          />
        </template>
      </UTable>

      <DataTablePagination v-if="!error" v-model:page="page" v-model:limit="limit" :total="orderPage?.additionalInfo.pagination.total ?? 0" />
    </template>
  </UDashboardPanel>
</template>
