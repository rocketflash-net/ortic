<script setup lang="ts">
import { CatalogPageName } from "@/features/catalog/models"
import { translate, type TranslationKey } from "@/plugins/language"

/**
 * Help page behind the three Instagram-highlight cards on the home page: payment, price list, shipping.
 * Each section has an anchor (`#pembayaran`, `#pricelist`, `#pengiriman`).
 */
const sections = [
  { key: "payment", anchor: "pembayaran", icon: "i-lucide-hand-coins", items: ["qris", "expiry", "total"], class: "bg-ortic-blue text-white" },
  { key: "pricelist", anchor: "pricelist", icon: "i-lucide-clipboard-list", items: ["same", "no_dm"], class: "bg-ortic-red text-white" },
  { key: "shipping", anchor: "pengiriman", icon: "i-lucide-shopping-bag", items: ["origin", "quote", "pickup", "complete"], class: "bg-ortic-yellow text-ortic-ink" },
] as const

const itemKey = (section: string, item: string) => `features.help.sections.${section}.items.${item}` as TranslationKey
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6 px-4 py-8">
    <h1 class="font-display text-4xl tracking-wide text-ortic-ink sm:text-5xl">{{ translate("features.help.title") }}</h1>

    <article v-for="section in sections" :id="section.anchor" :key="section.key" class="scroll-mt-24 rounded-xl border-2 border-ortic-ink bg-white p-5 shadow-comic">
      <div class="flex items-center gap-3">
        <span class="flex size-11 shrink-0 items-center justify-center rounded-full" :class="section.class">
          <UIcon :name="section.icon" class="size-6" />
        </span>
        <h2 class="font-display text-3xl tracking-wide text-ortic-ink">{{ translate(`features.help.sections.${section.key}.title`) }}</h2>
      </div>
      <ul class="mt-3 list-disc space-y-1.5 ps-5 text-toned">
        <li v-for="item in section.items" :key="item">{{ translate(itemKey(section.key, item)) }}</li>
      </ul>
      <UButton
        v-if="section.key === 'pricelist'"
        :to="{ name: CatalogPageName.PRODUCTS }"
        :label="translate('features.help.see_products')"
        trailing-icon="i-lucide-arrow-right"
        color="secondary"
        class="btn-comic mt-4 text-ortic-ink"
      />
    </article>

    <p class="text-sm text-muted">{{ translate("features.help.contact") }}</p>
  </section>
</template>
