<script setup lang="ts">
import { CatalogPageName } from "@/features/catalog/models"
import { LegalPageName } from "@/features/legal/models"
import { translate, type TranslationKey } from "@/plugins/language"
import { useStoreInfo } from "@/shared/composables/useStoreInfo"

/**
 * Help page behind the three Instagram-highlight cards on the home page: payment, price list, shipping.
 * Each section has an anchor (`#pembayaran`, `#pricelist`, `#pengiriman`).
 */
const sections = [
  {
    key: "payment",
    anchor: "pembayaran",
    icon: "i-lucide-hand-coins",
    items: ["qris", "expiry", "total"],
    class: "bg-ortic-blue text-white",
  },
  {
    key: "pricelist",
    anchor: "pricelist",
    icon: "i-lucide-clipboard-list",
    items: ["same", "no_dm"],
    class: "bg-ortic-red text-white",
  },
  {
    key: "shipping",
    anchor: "pengiriman",
    icon: "i-lucide-shopping-bag",
    items: ["origin", "quote", "pickup", "complete"],
    class: "bg-ortic-yellow text-ortic-ink",
  },
] as const

const { info, whatsappUrl, instagramUrl } = useStoreInfo()

const policies = [
  { name: LegalPageName.TERMS, key: "terms", icon: "i-lucide-scroll-text" },
  { name: LegalPageName.PRIVACY, key: "privacy", icon: "i-lucide-shield" },
  { name: LegalPageName.RETURNS, key: "returns", icon: "i-lucide-undo-2" },
] as const

const itemKey = (section: string, item: string) => `features.help.sections.${section}.items.${item}` as TranslationKey
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6 px-4 py-8">
    <h1 class="font-display text-4xl tracking-wide text-ortic-ink sm:text-5xl">
      {{ translate("features.help.title") }}
    </h1>

    <article
      v-for="section in sections"
      :id="section.anchor"
      :key="section.key"
      class="scroll-mt-24 rounded-xl border-2 border-ortic-ink bg-white p-5 shadow-comic"
    >
      <div class="flex items-center gap-3">
        <span class="flex size-11 shrink-0 items-center justify-center rounded-full" :class="section.class">
          <UIcon :name="section.icon" class="size-6" />
        </span>
        <h2 class="font-display text-3xl tracking-wide text-ortic-ink">
          {{ translate(`features.help.sections.${section.key}.title`) }}
        </h2>
      </div>
      <ul class="mt-3 list-disc space-y-1.5 ps-5 text-toned">
        <li v-for="item in section.items" :key="item">
          {{ translate(itemKey(section.key, item)) }}
        </li>
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

    <article id="kebijakan" class="scroll-mt-24 rounded-xl border-2 border-ortic-ink bg-white p-5 shadow-comic">
      <h2 class="font-display text-3xl tracking-wide text-ortic-ink">
        {{ translate("features.help.policies") }}
      </h2>
      <div class="mt-3 grid gap-2 sm:grid-cols-3">
        <UButton
          v-for="policy in policies"
          :key="policy.key"
          :to="{ name: policy.name }"
          :icon="policy.icon"
          :label="translate(`features.legal.${policy.key}`)"
          color="neutral"
          variant="outline"
          block
        />
      </div>
    </article>

    <article id="kontak" class="scroll-mt-24 rounded-xl border-2 border-ortic-ink bg-ortic-yellow p-5 shadow-comic">
      <h2 class="font-display text-3xl tracking-wide text-ortic-ink">
        {{ translate("features.help.contact_title") }}
      </h2>
      <p class="mt-1 text-sm text-ortic-ink">{{ translate("features.help.contact") }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <UButton
          v-if="whatsappUrl"
          :to="whatsappUrl"
          target="_blank"
          icon="i-lucide-message-circle"
          :label="`WhatsApp ${info.store_whatsapp}`"
          color="neutral"
          class="btn-comic"
        />
        <UButton
          v-if="instagramUrl"
          :to="instagramUrl"
          target="_blank"
          icon="i-lucide-instagram"
          :label="`@${info.store_instagram}`"
          color="neutral"
          variant="outline"
          class="bg-white"
        />
        <UButton
          v-if="info.store_email"
          :to="`mailto:${info.store_email}`"
          icon="i-lucide-mail"
          :label="info.store_email"
          color="neutral"
          variant="outline"
          class="bg-white"
        />
      </div>
    </article>
  </section>
</template>
