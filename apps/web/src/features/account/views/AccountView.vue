<script setup lang="ts">
import { storeToRefs } from "pinia"

import { useAuthStore } from "@/features/authentication/stores/authentication.store"
import { translate } from "@/plugins/language"

/**
 * Buyer account. Fase 1 shows who is signed in; addresses, phone number, and order history arrive with checkout.
 */
const authStore = useAuthStore()
const { userData } = storeToRefs(authStore)
</script>

<template>
  <section class="mx-auto max-w-2xl px-4 py-10">
    <h1 class="font-display text-4xl tracking-wide text-ortic-ink">{{ translate("features.account.title") }}</h1>

    <div class="mt-6 rounded-xl border-2 border-ortic-ink bg-white p-5 shadow-comic">
      <UUser
        v-if="userData"
        :name="userData.name"
        :description="userData.email"
        :avatar="{ src: userData.avatar, alt: userData.name }"
        size="xl"
      />
      <p class="mt-4 text-sm text-muted">{{ translate("features.account.coming_soon") }}</p>
      <UButton
        :label="translate('features.account.logout')"
        icon="i-lucide-log-out"
        color="error"
        variant="soft"
        class="mt-4"
        @click="authStore.handleLogout()"
      />
    </div>
  </section>
</template>
