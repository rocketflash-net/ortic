<script setup lang="ts">
import { useHead } from "@unhead/vue"
import { computed } from "vue"

import { translate } from "@/plugins/language"
import { useStoreInfo } from "@/shared/composables/useStoreInfo"

import { LEGAL_UPDATED_AT, legalContent } from "../content"
import { LegalPageName, type LegalPageKey } from "../models"

/**
 * Syarat & Ketentuan, Kebijakan Privasi, dan Kebijakan Retur. Kontak toko diambil dari pengaturan toko.
 */
const props = defineProps<{ page: LegalPageKey }>()

const { info, whatsappUrl, instagramUrl } = useStoreInfo()
const sections = computed(() => legalContent(props.page, info.value))
const title = computed(() => translate(`features.legal.${props.page}`))
const updated = new Date(`${LEGAL_UPDATED_AT}T00:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })

const others = computed(() =>
  (
    [
      { key: "terms", name: LegalPageName.TERMS },
      { key: "privacy", name: LegalPageName.PRIVACY },
      { key: "returns", name: LegalPageName.RETURNS },
    ] as const
  ).filter((item) => item.key !== props.page),
)

useHead({ title: computed(() => `${title.value} · Ortic`) })
</script>

<template>
  <section class="mx-auto max-w-3xl px-4 py-8">
    <h1 class="font-display text-4xl tracking-wide text-ortic-ink sm:text-5xl">{{ title }}</h1>
    <p class="mt-1 text-sm text-muted">{{ translate("features.legal.updated", { date: updated }) }}</p>

    <article class="rich-text mt-6 rounded-xl border-2 border-ortic-ink bg-white p-5 text-toned shadow-comic sm:p-7">
      <template v-for="section in sections" :key="section.title">
        <h2>{{ section.title }}</h2>
        <p v-for="paragraph in section.paragraphs ?? []" :key="paragraph">{{ paragraph }}</p>
        <ul v-if="section.list?.length">
          <li v-for="item in section.list" :key="item">{{ item }}</li>
        </ul>
      </template>
    </article>

    <div class="mt-6 flex flex-wrap items-center gap-2">
      <span class="text-sm font-semibold text-ortic-ink">{{ translate("features.legal.contact_title") }}:</span>
      <UButton
        v-if="whatsappUrl"
        :to="whatsappUrl"
        target="_blank"
        icon="i-lucide-message-circle"
        label="WhatsApp"
        color="neutral"
        variant="outline"
        size="sm"
      />
      <UButton
        v-if="instagramUrl"
        :to="instagramUrl"
        target="_blank"
        icon="i-lucide-instagram"
        :label="`@${info.store_instagram}`"
        color="neutral"
        variant="outline"
        size="sm"
      />
      <UButton
        v-if="info.store_email"
        :to="`mailto:${info.store_email}`"
        icon="i-lucide-mail"
        :label="info.store_email"
        color="neutral"
        variant="outline"
        size="sm"
      />
    </div>

    <div class="mt-6 flex flex-wrap gap-2">
      <span class="w-full text-sm font-semibold text-ortic-ink">{{ translate("features.legal.other") }}</span>
      <UButton
        v-for="item in others"
        :key="item.key"
        :to="{ name: item.name }"
        :label="translate(`features.legal.${item.key}`)"
        color="secondary"
        variant="soft"
        size="sm"
      />
    </div>
  </section>
</template>
