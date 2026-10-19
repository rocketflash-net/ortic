<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui"
import { keepPreviousData, useQuery } from "@tanstack/vue-query"
import { computed } from "vue"

import { translate } from "@/plugins/language"
import DataTablePagination from "@/shared/components/DataTablePagination.vue"
import DataTableToolbar from "@/shared/components/DataTableToolbar.vue"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import SearchInput from "@/shared/components/SearchInput.vue"
import { useDateFormatter } from "@/shared/composables/useDateFormatter"
import { useDebouncedQueryModel, useRouteQueryState } from "@/shared/composables/useRouteQueryState"
import { paginationParams, stringParam } from "@/shared/helpers/query-param"

import type { Customer, CustomerListParams } from "../models"
import { customerQueryKeys, getCustomers } from "../services/api"

const { formatDate } = useDateFormatter()

// Search and pagination are kept in the URL so a refresh or shared link shows the same list.
const { page, limit, q: search } = useRouteQueryState(
  {
    ...paginationParams(),
    q: stringParam({ maxLength: 100 }),
  },
  { resetKey: "page" },
)

const searchInput = useDebouncedQueryModel(search)

const listParams = computed<CustomerListParams>(() => ({ page: page.value, limit: limit.value, search: search.value }))

const { data: customerPage, isFetching, error, refetch } = useQuery({
  queryKey: computed(() => customerQueryKeys.list(listParams.value)),
  queryFn: () => getCustomers(listParams.value),
  placeholderData: keepPreviousData,
})

const columns: TableColumn<Customer>[] = [
  // `max-w-0` + `w-full` lets long names and emails truncate instead of pushing the other columns off screen.
  { accessorKey: "name", header: translate("features.customers.table.customer"), meta: { class: { td: "w-full max-w-0" } } },
  { accessorKey: "role", header: translate("features.customers.table.role") },
  { accessorKey: "created_at", header: translate("features.customers.table.joined"), meta: { class: { th: "hidden sm:table-cell", td: "hidden sm:table-cell" } } },
]
</script>

<template>
  <UDashboardPanel id="customers">
    <template #header>
      <UDashboardNavbar :title="translate('features.customers.page_title')" />

      <DataTableToolbar>
        <SearchInput v-model="searchInput" :placeholder="translate('features.customers.filters.search_placeholder')" />
      </DataTableToolbar>
    </template>

    <template #body>
      <QueryErrorAlert
        v-if="error"
        :title="translate('features.customers.load_error_title')"
        :error="error"
        @retry="refetch()"
      />

      <UTable
        v-else
        :data="customerPage?.data ?? []"
        :columns="columns"
        :loading="isFetching"
        sticky="header"
        class="flex-1"
        :ui="{ td: 'py-3' }"
      >
        <template #name-cell="{ row }">
          <UUser
            :name="row.original.name"
            :description="row.original.email"
            :avatar="{ src: row.original.avatar_url ?? undefined, alt: row.original.name, class: 'bg-elevated' }"
            :ui="{ root: 'min-w-0', wrapper: 'min-w-0', name: 'truncate', description: 'truncate' }"
          />
        </template>

        <template #role-cell="{ row }">
          <UBadge
            :label="translate(`features.customers.roles.${row.original.role}`)"
            :color="row.original.role === 'user' ? 'neutral' : 'primary'"
            variant="subtle"
          />
        </template>

        <template #created_at-cell="{ row }">
          <span class="text-toned">{{ formatDate(row.original.created_at) }}</span>
        </template>

        <template #empty>
          <UEmpty
            icon="i-lucide-user-search"
            :title="translate('features.customers.table.empty_title')"
            :description="translate('features.customers.table.empty_description')"
            :actions="search ? [{ label: translate('utils.common.clear_search'), icon: 'i-lucide-x', color: 'neutral', variant: 'subtle', onClick: () => (search = '') }] : []"
            variant="naked"
          />
        </template>
      </UTable>

      <DataTablePagination
        v-if="!error"
        v-model:page="page"
        v-model:limit="limit"
        :total="customerPage?.additionalInfo.pagination.total ?? 0"
      />
    </template>
  </UDashboardPanel>
</template>
