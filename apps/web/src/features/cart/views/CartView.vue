<script setup lang="ts">
import { storeToRefs } from "pinia"

import { CatalogPageName } from "@/features/catalog/models"
import { CheckoutPageName } from "@/features/checkout/models"
import { translate } from "@/plugins/language"
import { formatCurrency, formatNumber } from "@/shared/helpers/number"

import { MAX_CART_QUANTITY, useCartStore } from "../stores/cart.store"

/**
 * Cart saved in this browser (guests too). Checkout asks for login, then re-prices it on the server.
 */
const cart = useCartStore()
const { items, count, subtotal, weightGram } = storeToRefs(cart)
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-8">
    <h1 class="font-display text-4xl tracking-wide text-ortic-ink sm:text-5xl">{{ translate("features.cart.title") }}</h1>

    <div v-if="items.length === 0" class="mt-8 rounded-xl border-2 border-dashed border-ortic-ink/40 p-10 text-center">
      <UIcon name="i-lucide-shopping-cart" class="size-10 text-zinc-400" />
      <p class="mt-3 font-semibold text-ortic-ink">{{ translate("features.cart.empty_title") }}</p>
      <p class="text-sm text-muted">{{ translate("features.cart.empty_description") }}</p>
      <UButton :to="{ name: CatalogPageName.PRODUCTS }" :label="translate('features.cart.shop')" color="secondary" class="btn-comic mt-4 text-ortic-ink" />
    </div>

    <div v-else class="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <ul class="divide-y-2 divide-ortic-ink/10 overflow-hidden rounded-xl border-2 border-ortic-ink bg-white">
        <li v-for="item in items" :key="item.variant_id" class="flex gap-3 p-3 sm:gap-4 sm:p-4">
          <RouterLink :to="{ name: CatalogPageName.PRODUCT, params: { slug: item.product_slug } }" class="size-20 shrink-0 overflow-hidden rounded-lg border-2 border-ortic-ink/20 bg-ortic-50">
            <img v-if="item.image_url" :src="item.image_url" :alt="item.product_name" class="size-full object-contain p-1" />
          </RouterLink>
          <div class="min-w-0 flex-1">
            <RouterLink :to="{ name: CatalogPageName.PRODUCT, params: { slug: item.product_slug } }" class="line-clamp-2 font-semibold text-ortic-ink hover:text-ortic-blue">
              {{ item.product_name }}
            </RouterLink>
            <p v-if="item.variant_name" class="text-sm text-muted">{{ item.variant_name }}</p>
            <p class="mt-1 font-bold text-ortic-ink">{{ formatCurrency(item.price) }}</p>
            <div class="mt-2 flex items-center gap-2">
              <UInputNumber
                :model-value="item.quantity"
                :min="1"
                :max="MAX_CART_QUANTITY"
                size="sm"
                class="w-28"
                :aria-label="translate('features.cart.quantity')"
                @update:model-value="(value: number | null) => cart.setQuantity(item.variant_id, value ?? 1)"
              />
              <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="sm" :aria-label="translate('features.cart.remove')" @click="cart.remove(item.variant_id)" />
            </div>
          </div>
          <p class="hidden shrink-0 font-semibold text-ortic-ink sm:block">{{ formatCurrency(item.price * item.quantity) }}</p>
        </li>
      </ul>

      <aside class="space-y-3 rounded-xl border-2 border-ortic-ink bg-white p-4 shadow-comic lg:sticky lg:top-20">
        <h2 class="font-display text-2xl tracking-wide text-ortic-ink">{{ translate("features.cart.summary") }}</h2>
        <dl class="space-y-1 text-sm">
          <div class="flex justify-between"><dt class="text-muted">{{ translate("features.cart.items", { count }) }}</dt><dd>{{ formatCurrency(subtotal) }}</dd></div>
          <div class="flex justify-between"><dt class="text-muted">{{ translate("features.cart.weight") }}</dt><dd>{{ formatNumber(weightGram / 1000, "id-ID", 2) }} kg</dd></div>
          <div class="flex justify-between"><dt class="text-muted">{{ translate("features.cart.shipping") }}</dt><dd class="text-muted">{{ translate("features.cart.shipping_later") }}</dd></div>
        </dl>
        <div class="flex justify-between border-t-2 border-ortic-ink/10 pt-3 font-bold text-ortic-ink">
          <span>{{ translate("features.cart.subtotal") }}</span>
          <span>{{ formatCurrency(subtotal) }}</span>
        </div>
        <UButton :to="{ name: CheckoutPageName.CHECKOUT }" :label="translate('features.cart.checkout')" icon="i-lucide-qr-code" color="secondary" size="lg" block class="btn-comic text-ortic-ink" />
        <p class="text-xs text-muted">{{ translate("features.cart.checkout_note") }}</p>
        <UButton :label="translate('features.cart.clear')" color="neutral" variant="ghost" size="sm" block @click="cart.clear()" />
      </aside>
    </div>
  </section>
</template>
