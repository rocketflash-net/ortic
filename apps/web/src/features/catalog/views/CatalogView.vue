<script setup lang="ts">
import { keepPreviousData, useQuery } from "@tanstack/vue-query"
import { computed } from "vue"

import { HomePageName } from "@/features/home/models"
import { catalogQueryKeys, getCategories } from "@/features/home/services/api"
import { translate } from "@/plugins/language"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { useRouteQueryState } from "@/shared/composables/useRouteQueryState"
import { getApiErrorCode } from "@/shared/helpers/error"
import { integerParam, literalParam, stringParam } from "@/shared/helpers/query-param"
import NotFoundView from "@/shared/views/NotFoundView.vue"

import ProductCard from "../components/ProductCard.vue"
import { CATALOG_SORTS, CatalogPageName, type CatalogProductParams } from "../models"
import { getCatalogProducts, productQueryKeys } from "../services/api"

/**
 * Product grid for all products (`/produk`, with `?q=` from the header search) and one category (`/kategori/:slug`).
 * Search, sort, and page live in the URL so links from Instagram or WhatsApp open the same list.
 */
const props = defineProps<{ slug?: string }>()

const PAGE_SIZE = 24

const { q, sort, page } = useRouteQueryState(
  {
    q: stringParam({ maxLength: 100 }),
    sort: literalParam(CATALOG_SORTS, "newest"),
    page: integerParam({ default: 1, min: 1 }),
  },
  { resetKey: "page" },
)

const params = computed<CatalogProductParams>(() => ({ page: page.value, limit: PAGE_SIZE, search: q.value, category: props.slug, sort: sort.value }))

const productsQuery = useQuery({
  queryKey: computed(() => productQueryKeys.list(params.value)),
  queryFn: () => getCatalogProducts(params.value),
  placeholderData: keepPreviousData,
})
const categoriesQuery = useQuery({ queryKey: catalogQueryKeys.categories, queryFn: getCategories, select: (response) => response.data ?? [] })

const products = computed(() => productsQuery.data.value?.data ?? [])
const total = computed(() => productsQuery.data.value?.additionalInfo.pagination.total ?? 0)
const category = computed(() => productsQuery.data.value?.additionalInfo.category ?? null)
const isUnknownCategory = computed(() => getApiErrorCode(productsQuery.error.value) === "44")

const title = computed(() => {
  if (props.slug) return category.value?.name ?? categoriesQuery.data.value?.find((item) => item.slug === props.slug)?.name ?? ""
  return q.value ? translate("features.catalog.search_title", { q: q.value }) : translate("features.catalog.all_title")
})

const sortItems = computed(() => CATALOG_SORTS.map((value) => ({ label: translate(`features.catalog.sort.${value}`), value })))

const chipClass = (active: boolean) =>
  active ? "bg-ortic-ink text-white border-ortic-ink" : "bg-white text-ortic-ink border-ortic-ink hover:bg-ortic-yellow"
</script>

<template>
  <NotFoundView v-if="isUnknownCategory" />

  <section v-else class="mx-auto max-w-6xl px-4 py-8">
    <!-- Category chips -->
    <nav class="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0" :aria-label="translate('utils.navigation.categories')">
      <RouterLink
        :to="{ name: CatalogPageName.PRODUCTS }"
        class="shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition-colors"
        :class="chipClass(!slug)"
      >
        {{ translate("features.catalog.all_categories") }}
      </RouterLink>
      <RouterLink
        v-for="item in categoriesQuery.data.value ?? []"
        :key="item.id"
        :to="{ name: CatalogPageName.CATEGORY, params: { slug: item.slug } }"
        class="shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors"
        :class="chipClass(item.slug === slug)"
      >
        {{ item.name }}
      </RouterLink>
    </nav>

    <div class="mt-5 flex flex-wrap items-end justify-between gap-3">
      <div class="min-w-0">
        <h1 class="font-display text-4xl tracking-wide break-words text-ortic-ink sm:text-5xl">{{ title }}</h1>
        <p class="text-sm text-muted">{{ translate("features.catalog.count", { count: total }) }}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="hidden text-sm text-muted sm:inline">{{ translate("features.catalog.sort.label") }}</span>
        <div class="w-44">
          <USelect v-model="sort" :items="sortItems" :aria-label="translate('features.catalog.sort.label')" class="w-full" />
        </div>
      </div>
    </div>

    <QueryErrorAlert
      v-if="productsQuery.isError.value"
      class="mt-6"
      :title="translate('features.catalog.load_error')"
      :error="productsQuery.error.value"
      @retry="productsQuery.refetch()"
    />

    <div v-else-if="productsQuery.isPending.value" class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <USkeleton v-for="n in 8" :key="n" class="aspect-[3/4] rounded-xl" />
    </div>

    <div v-else-if="products.length === 0" class="mt-10 rounded-xl border-2 border-dashed border-ortic-ink/40 p-10 text-center">
      <UIcon name="i-lucide-package-search" class="size-10 text-zinc-400" />
      <p class="mt-3 font-semibold text-ortic-ink">{{ translate("features.catalog.empty_title") }}</p>
      <p class="text-sm text-muted">{{ translate("features.catalog.empty_description") }}</p>
      <UButton :to="{ name: HomePageName.HOME, hash: '#kategori' }" :label="translate('utils.navigation.categories')" color="secondary" class="btn-comic mt-4 text-ortic-ink" />
    </div>

    <template v-else>
      <div class="mt-6 grid grid-cols-2 gap-4 transition-opacity sm:grid-cols-3 lg:grid-cols-4" :class="{ 'opacity-60': productsQuery.isFetching.value }">
        <ProductCard v-for="product in products" :key="product.id" :product="product" />
      </div>
      <div v-if="total > PAGE_SIZE" class="mt-8 flex justify-center">
        <UPagination v-model:page="page" :total="total" :items-per-page="PAGE_SIZE" />
      </div>
    </template>
  </section>
</template>
