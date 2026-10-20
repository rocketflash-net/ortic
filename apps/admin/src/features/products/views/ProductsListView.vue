<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from "@nuxt/ui"
import { useOverlay } from "@nuxt/ui/composables"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed } from "vue"
import { useRouter } from "vue-router"

import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import DataTablePagination from "@/shared/components/DataTablePagination.vue"
import DataTableToolbar from "@/shared/components/DataTableToolbar.vue"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import SearchInput from "@/shared/components/SearchInput.vue"
import { useDebouncedQueryModel, useRouteQueryState } from "@/shared/composables/useRouteQueryState"
import { saveBlob } from "@/shared/helpers/download"
import { getApiErrorMessage } from "@/shared/helpers/error"
import { formatCurrency } from "@/shared/helpers/number"
import { integerParam, literalParam, paginationParams, stringParam } from "@/shared/helpers/query-param"

import ProductImportModal from "../components/ProductImportModal.vue"
import { PRODUCT_STATUSES, ProductsPageName, type ProductListItem, type ProductListParams, type ProductStatus } from "../models"
import { duplicateProduct, exportProductsCsv, getCategories, getProducts, productQueryKeys, updateProductStatus } from "../services/api"

/**
 * Product list with search (name or SKU), status and category filters kept in the URL, and quick status changes.
 */
const router = useRouter()
const queryClient = useQueryClient()
const { showToast } = useAppToast()

const ALL = "all"
const {
  page,
  limit,
  q: search,
  status,
  category,
} = useRouteQueryState(
  {
    ...paginationParams(),
    q: stringParam({ maxLength: 100 }),
    status: literalParam([ALL, ...PRODUCT_STATUSES], ALL),
    category: integerParam({ default: 0, min: 0 }),
  },
  { resetKey: "page" },
)
const searchInput = useDebouncedQueryModel(search)

const listParams = computed<ProductListParams>(() => ({
  page: page.value,
  limit: limit.value,
  search: search.value,
  status: status.value === ALL ? undefined : (status.value as ProductStatus),
  category_id: category.value || undefined,
}))

const { data: productPage, isFetching, error, refetch } = useQuery({
  queryKey: computed(() => productQueryKeys.list(listParams.value)),
  queryFn: () => getProducts(listParams.value),
  placeholderData: keepPreviousData,
})

const categoriesQuery = useQuery({ queryKey: productQueryKeys.categories, queryFn: getCategories, select: (response) => response.data ?? [] })
const categoryItems = computed(() => [
  { label: translate("features.products.filters.all_categories"), value: 0 },
  ...(categoriesQuery.data.value ?? []).map((item) => ({ label: item.name, value: item.id })),
])
const statusItems = computed(() => [
  { label: translate("features.products.filters.all_statuses"), value: ALL },
  ...PRODUCT_STATUSES.map((value) => ({ label: translate(`features.products.status.${value}`), value })),
])

const STATUS_COLOR = { active: "success", draft: "neutral", archived: "warning" } as const

const priceLabel = (product: ProductListItem) => {
  if (product.price_min === null || product.price_max === null) return translate("features.products.table.no_price")
  return product.price_min === product.price_max ? formatCurrency(product.price_min) : `${formatCurrency(product.price_min)} – ${formatCurrency(product.price_max)}`
}

const { mutate: changeStatus } = useMutation({
  mutationFn: ({ id, status: next }: { id: number; status: ProductStatus }) => updateProductStatus(id, next),
  onSuccess: (_response, { status: next }) => {
    queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
    showToast.success({ title: translate("features.products.actions.status_updated", { status: translate(`features.products.status.${next}`) }) })
  },
  onError: (mutationError) => showToast.error({ title: translate("features.products.actions.status_error"), description: getApiErrorMessage(mutationError) }),
})

const importModal = useOverlay().create(ProductImportModal)

const { mutate: duplicate } = useMutation({
  mutationFn: (id: number) => duplicateProduct(id),
  onSuccess: (response) => {
    queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
    showToast.success({ title: translate("features.products.actions.duplicated") })
    router.push({ name: ProductsPageName.PRODUCT_EDIT, params: { id: response.data!.id } })
  },
  onError: (mutationError) => showToast.error({ title: translate("features.products.actions.duplicate_error"), description: getApiErrorMessage(mutationError) }),
})

const { mutate: exportCsv, isPending: isExporting } = useMutation({
  mutationFn: exportProductsCsv,
  onSuccess: (blob) => saveBlob(blob, "produk-ortic.csv"),
  onError: (mutationError) => showToast.error({ title: translate("features.products.export.error"), description: getApiErrorMessage(mutationError) }),
})

const editRoute = (product: ProductListItem) => ({ name: ProductsPageName.PRODUCT_EDIT, params: { id: product.id } })

const rowActions = (product: ProductListItem): DropdownMenuItem[][] => [
  [
    { label: translate("features.products.actions.edit"), icon: "i-lucide-pencil", to: editRoute(product) },
    { label: translate("features.products.actions.duplicate"), icon: "i-lucide-copy", onSelect: () => duplicate(product.id) },
  ],
  [
    ...(product.status !== "active" ? [{ label: translate("features.products.actions.activate"), icon: "i-lucide-eye", onSelect: () => changeStatus({ id: product.id, status: "active" }) }] : []),
    ...(product.status !== "draft" ? [{ label: translate("features.products.actions.to_draft"), icon: "i-lucide-file-pen", onSelect: () => changeStatus({ id: product.id, status: "draft" }) }] : []),
    ...(product.status !== "archived"
      ? [{ label: translate("features.products.actions.archive"), icon: "i-lucide-archive", color: "warning" as const, onSelect: () => changeStatus({ id: product.id, status: "archived" }) }]
      : []),
  ],
]

const columns: TableColumn<ProductListItem>[] = [
  { accessorKey: "name", header: translate("features.products.table.product"), meta: { class: { td: "w-full max-w-0" } } },
  { accessorKey: "category", header: translate("features.products.table.category"), meta: { class: { th: "hidden lg:table-cell", td: "hidden lg:table-cell" } } },
  { accessorKey: "price_min", header: translate("features.products.table.price"), meta: { class: { th: "hidden sm:table-cell", td: "hidden sm:table-cell whitespace-nowrap" } } },
  { accessorKey: "status", header: translate("features.products.table.status") },
  { id: "actions", meta: { class: { td: "w-px" } } },
]

const hasFilters = computed(() => Boolean(search.value) || status.value !== ALL || category.value !== 0)
const clearFilters = () => {
  search.value = ""
  status.value = ALL
  category.value = 0
}
</script>

<template>
  <UDashboardPanel id="products">
    <template #header>
      <UDashboardNavbar :title="translate('features.products.page_title')">
        <template #right>
          <UButton :label="translate('features.products.export.button')" icon="i-lucide-download" color="neutral" variant="ghost" class="hidden sm:inline-flex" :loading="isExporting" @click="exportCsv()" />
          <UButton :label="translate('features.products.import.button')" icon="i-lucide-upload" color="neutral" variant="outline" class="hidden sm:inline-flex" @click="importModal.open({})" />
          <UButton :label="translate('features.products.add')" icon="i-lucide-plus" :to="{ name: ProductsPageName.PRODUCT_CREATE }" />
        </template>
      </UDashboardNavbar>

      <DataTableToolbar>
        <SearchInput v-model="searchInput" :placeholder="translate('features.products.filters.search_placeholder')" />
        <template #filters>
          <div class="w-44 shrink-0"><USelect v-model="status" :items="statusItems" class="w-full" /></div>
          <div class="w-56 shrink-0"><USelect v-model="category" :items="categoryItems" class="w-full" /></div>
        </template>
      </DataTableToolbar>
    </template>

    <template #body>
      <QueryErrorAlert v-if="error" :title="translate('features.products.load_error')" :error="error" @retry="refetch()" />

      <UTable
        v-else
        :data="productPage?.data ?? []"
        :columns="columns"
        :loading="isFetching"
        sticky="header"
        class="flex-1"
        :ui="{ td: 'py-3', tr: 'cursor-pointer' }"
        @select="(_event, row) => router.push(editRoute(row.original))"
      >
        <template #name-cell="{ row }">
          <div class="flex min-w-0 items-center gap-3">
            <div class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-default bg-elevated">
              <img v-if="row.original.image_url" :src="row.original.image_url" :alt="row.original.name" class="size-full object-contain" loading="lazy" />
              <UIcon v-else name="i-lucide-image" class="size-5 text-dimmed" />
            </div>
            <div class="min-w-0">
              <p class="truncate font-medium text-highlighted">{{ row.original.name }}</p>
              <p class="truncate text-sm text-muted">
                {{ [row.original.brand_name, translate("features.products.table.variant_count", { count: row.original.variant_count })].filter(Boolean).join(" · ") }}
              </p>
              <p class="truncate text-sm text-toned sm:hidden">{{ priceLabel(row.original) }}</p>
            </div>
          </div>
        </template>

        <template #category-cell="{ row }">
          <span class="text-toned">{{ row.original.category.name }}</span>
        </template>

        <template #price_min-cell="{ row }">
          <span class="text-toned tabular-nums">{{ priceLabel(row.original) }}</span>
        </template>

        <template #status-cell="{ row }">
          <UBadge :label="translate(`features.products.status.${row.original.status}`)" :color="STATUS_COLOR[row.original.status]" variant="subtle" />
        </template>

        <template #actions-cell="{ row }">
          <UDropdownMenu :items="rowActions(row.original)" :content="{ align: 'end' }">
            <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="sm" aria-label="Menu" @click.stop />
          </UDropdownMenu>
        </template>

        <template #empty>
          <UEmpty
            icon="i-lucide-package-search"
            :title="translate('features.products.table.empty_title')"
            :description="translate('features.products.table.empty_description')"
            :actions="
              hasFilters
                ? [{ label: translate('utils.common.clear_filters'), icon: 'i-lucide-x', color: 'neutral', variant: 'subtle', onClick: clearFilters }]
                : [{ label: translate('features.products.add'), icon: 'i-lucide-plus', to: { name: ProductsPageName.PRODUCT_CREATE } }]
            "
            variant="naked"
          />
        </template>
      </UTable>

      <DataTablePagination v-if="!error" v-model:page="page" v-model:limit="limit" :total="productPage?.additionalInfo.pagination.total ?? 0" />
    </template>
  </UDashboardPanel>
</template>
