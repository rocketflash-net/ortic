<script setup lang="ts">
import { translate } from "@/plugins/language"
import { formatCurrency } from "@/shared/helpers/number"

import { CatalogPageName, type CatalogProduct } from "../models"

/**
 * Product tile in the poster style of the store: cut-out photo on a light halftone panel, name, and price
 * ("from" when variants differ in price).
 */
defineProps<{ product: CatalogProduct }>()
</script>

<template>
  <RouterLink
    :to="{ name: CatalogPageName.PRODUCT, params: { slug: product.slug } }"
    class="group flex flex-col overflow-hidden rounded-xl border-2 border-ortic-ink bg-white shadow-comic transition-transform hover:-translate-y-0.5 hover:shadow-comic-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ortic-blue"
  >
    <div class="relative aspect-square border-b-2 border-ortic-ink bg-ortic-50">
      <div class="absolute inset-0 bg-halftone opacity-60" aria-hidden="true" />
      <img
        v-if="product.image_url"
        :src="product.image_url"
        :alt="product.name"
        class="relative size-full object-contain p-3 transition-transform group-hover:scale-105"
        :class="{ 'opacity-50 grayscale': !product.in_stock }"
        loading="lazy"
      />
      <UIcon v-else name="i-lucide-image" class="relative m-auto size-10 text-zinc-400" />
      <span
        v-if="!product.in_stock"
        class="absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full border-2 border-ortic-ink bg-white px-2 py-0.5 text-[11px] font-bold text-ortic-ink uppercase"
      >
        {{ translate("features.catalog.out_of_stock") }}
      </span>
      <span
        v-if="product.compare_at_price"
        class="absolute top-2 right-2 rotate-3 rounded-md border-2 border-ortic-ink bg-ortic-red px-2 py-0.5 text-[11px] font-bold text-white uppercase"
      >
        {{ translate("features.catalog.promo") }}
      </span>
      <span
        v-if="product.variant_count > 1"
        class="absolute top-2 left-2 rounded-full border-2 border-ortic-ink bg-ortic-yellow px-2 py-0.5 text-[11px] font-semibold text-ortic-ink"
      >
        {{ translate("features.catalog.variants", { count: product.variant_count }) }}
      </span>
    </div>
    <div class="flex flex-1 flex-col gap-1 p-3">
      <p v-if="product.brand_name" class="text-xs font-semibold tracking-wide text-ortic-blue uppercase">
        {{ product.brand_name }}
      </p>
      <p class="line-clamp-2 text-sm font-semibold text-ortic-ink sm:text-base">
        {{ product.name }}
      </p>
      <div class="mt-auto pt-1">
        <p v-if="product.compare_at_price" class="text-xs text-zinc-500 line-through">
          {{ formatCurrency(product.compare_at_price) }}
        </p>
        <p class="font-bold text-ortic-ink">
          {{ formatCurrency(product.price_min)
          }}<span v-if="product.price_max > product.price_min" class="text-sm font-medium text-zinc-500"> – {{ formatCurrency(product.price_max) }}</span>
        </p>
      </div>
    </div>
  </RouterLink>
</template>
