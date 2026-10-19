<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query"

import badgeUrl from "@/assets/logo-badge.svg"
import ProductCard from "@/features/catalog/components/ProductCard.vue"
import { CatalogPageName } from "@/features/catalog/models"
import { getCatalogProducts, productQueryKeys } from "@/features/catalog/services/api"
import { HelpPageName } from "@/features/help/models"
import { translate } from "@/plugins/language"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"

import type { Category } from "../models"
import { catalogQueryKeys, getCategories } from "../services/api"

/**
 * Store home: poster-style hero, the categories in the feed's red/yellow/blue blocks, the newest products, and the
 * three help sections that mirror the Instagram highlights (payment, price list, shipping).
 */
const categoriesQuery = useQuery({
  queryKey: catalogQueryKeys.categories,
  queryFn: getCategories,
  select: (response) => response.data ?? [],
})

const latestParams = { page: 1, limit: 8, sort: "newest" as const }
const latestQuery = useQuery({
  queryKey: productQueryKeys.list(latestParams),
  queryFn: () => getCatalogProducts(latestParams),
  select: (response) => response.data ?? [],
})

const tileClass: Record<NonNullable<Category["color"]>, string> = {
  red: "bg-ortic-red text-white",
  yellow: "bg-ortic-yellow text-ortic-ink",
  blue: "bg-ortic-blue text-white",
}

const highlights = [
  { key: "payment", anchor: "#pembayaran", icon: "i-lucide-hand-coins", class: "bg-ortic-blue text-white" },
  { key: "pricelist", anchor: "#pricelist", icon: "i-lucide-clipboard-list", class: "bg-ortic-blue text-white" },
  { key: "shipping", anchor: "#pengiriman", icon: "i-lucide-shopping-bag", class: "bg-ortic-yellow text-ortic-ink" },
] as const
</script>

<template>
  <section class="relative overflow-hidden bg-ortic-blue bg-halftone-light text-white">
    <div class="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-[1fr_auto] md:py-16">
      <div>
        <div class="flex gap-2" aria-hidden="true">
          <span class="h-2 w-12 rounded-full bg-ortic-red" />
          <span class="h-2 w-12 rounded-full bg-ortic-yellow" />
          <span class="h-2 w-12 rounded-full bg-white" />
        </div>
        <h1 class="mt-5 font-display text-5xl leading-none tracking-wide sm:text-7xl">{{ translate("features.home.hero.title") }}</h1>
        <p class="mt-4 max-w-xl text-lg text-white/85">{{ translate("features.home.hero.description") }}</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <UButton
            :to="{ name: CatalogPageName.PRODUCTS }"
            :label="translate('features.home.hero.cta')"
            color="secondary"
            size="xl"
            trailing-icon="i-lucide-arrow-right"
            class="btn-comic text-ortic-ink"
          />
          <UButton
            to="#kategori"
            :label="translate('features.home.hero.categories')"
            color="neutral"
            variant="outline"
            size="xl"
            class="bg-white/10 text-white ring-white/60 hover:bg-white/20"
          />
        </div>
      </div>
      <img :src="badgeUrl" alt="" class="mx-auto hidden w-56 -rotate-3 md:block lg:w-64" />
    </div>
  </section>

  <section id="kategori" class="mx-auto max-w-6xl scroll-mt-20 px-4 py-10">
    <h2 class="font-display text-4xl tracking-wide text-ortic-ink">{{ translate("features.home.categories.title") }}</h2>

    <QueryErrorAlert
      v-if="categoriesQuery.isError.value"
      class="mt-4"
      :title="translate('features.home.categories.load_error')"
      :error="categoriesQuery.error.value"
      @retry="categoriesQuery.refetch()"
    />

    <div v-else class="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <template v-if="categoriesQuery.isPending.value">
        <USkeleton v-for="n in 8" :key="n" class="aspect-square rounded-xl" />
      </template>
      <RouterLink
        v-for="category in categoriesQuery.data.value ?? []"
        v-else
        :key="category.id"
        :to="{ name: CatalogPageName.CATEGORY, params: { slug: category.slug } }"
        class="group relative flex aspect-square items-end overflow-hidden rounded-xl border-2 border-ortic-ink p-4 shadow-comic transition-transform hover:-translate-y-0.5 hover:shadow-comic-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ortic-ink"
        :class="tileClass[category.color ?? 'blue']"
      >
        <div class="absolute inset-0 bg-halftone" aria-hidden="true" />
        <span class="relative font-display text-2xl leading-tight tracking-wide sm:text-3xl">{{ category.name }}</span>
        <UIcon name="i-lucide-arrow-up-right" class="absolute top-3 right-3 size-6 opacity-70 transition-opacity group-hover:opacity-100" />
      </RouterLink>
    </div>
  </section>

  <section v-if="latestQuery.data.value?.length" class="mx-auto max-w-6xl px-4 pb-10">
    <div class="flex items-end justify-between gap-3">
      <h2 class="font-display text-4xl tracking-wide text-ortic-ink">{{ translate("features.catalog.latest") }}</h2>
      <UButton :to="{ name: CatalogPageName.PRODUCTS }" :label="translate('features.catalog.see_all')" trailing-icon="i-lucide-arrow-right" color="neutral" variant="link" class="text-ortic-blue" />
    </div>
    <div class="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <ProductCard v-for="product in latestQuery.data.value" :key="product.id" :product="product" />
    </div>
  </section>

  <section class="mx-auto grid max-w-6xl gap-4 px-4 pb-12 sm:grid-cols-3">
    <RouterLink
      v-for="item in highlights"
      :key="item.key"
      :to="{ name: HelpPageName.HELP, hash: item.anchor }"
      class="flex items-center gap-4 rounded-xl border-2 border-ortic-ink bg-white p-4 shadow-comic transition-transform hover:-translate-y-0.5 hover:shadow-comic-lg"
    >
      <span class="flex size-12 shrink-0 items-center justify-center rounded-full" :class="item.class">
        <UIcon :name="item.icon" class="size-6" />
      </span>
      <div>
        <p class="font-semibold text-ortic-ink">{{ translate(`features.home.highlights.${item.key}.title`) }}</p>
        <p class="text-sm text-muted">{{ translate(`features.home.highlights.${item.key}.description`) }}</p>
      </div>
    </RouterLink>
  </section>
</template>
