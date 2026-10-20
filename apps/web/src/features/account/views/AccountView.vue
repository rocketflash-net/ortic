<script setup lang="ts">
import { useMutation } from "@tanstack/vue-query"
import { storeToRefs } from "pinia"
import { computed, reactive, watch } from "vue"

import { useAuthStore } from "@/features/authentication/stores/authentication.store"
import { OrdersPageName } from "@/features/orders/models"
import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import { getApiErrorMessage, getApiFieldErrors } from "@/shared/helpers/error"

import { updateProfile } from "../services/api"

/**
 * Buyer account: name, WhatsApp number (used for new shipping addresses and courier contact), and profession.
 */
const authStore = useAuthStore()
const { userData } = storeToRefs(authStore)
const { showToast } = useAppToast()

const PROFESSIONS = ["Dokter gigi", "Mahasiswa FKG", "Klinik", "Lab gigi", "Lainnya"]
const professionItems = PROFESSIONS.map((value) => ({ label: value, value }))

const form = reactive({ name: "", phone: "", profession: undefined as string | undefined })
const fill = () => {
  form.name = userData.value?.name ?? ""
  form.phone = userData.value?.phone ?? ""
  form.profession = userData.value?.profession ?? undefined
}
watch(userData, fill, { immediate: true })

const phoneValid = computed(() => form.phone.trim() === "" || /^\+?\d{8,15}$/.test(form.phone.replace(/[\s-]/g, "")))
const isDirty = computed(
  () =>
    form.name.trim() !== (userData.value?.name ?? "") ||
    form.phone.trim() !== (userData.value?.phone ?? "") ||
    (form.profession ?? null) !== (userData.value?.profession ?? null),
)
const canSave = computed(() => isDirty.value && form.name.trim().length > 0 && phoneValid.value)

const { mutate: save, isPending } = useMutation({
  mutationFn: () =>
    updateProfile({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      profession: form.profession ?? null,
    }),
  onSuccess: (response) => {
    if (response.data) authStore.setUser(response.data)
    showToast.success({ title: translate("features.account.saved") })
  },
  onError: (error) =>
    showToast.error({
      title: translate("features.account.save_error"),
      description: getApiFieldErrors(error)[0]?.message ?? getApiErrorMessage(error),
    }),
})
</script>

<template>
  <section class="mx-auto max-w-2xl space-y-6 px-4 py-10">
    <h1 class="font-display text-4xl tracking-wide text-ortic-ink">
      {{ translate("features.account.title") }}
    </h1>

    <div class="rounded-xl border-2 border-ortic-ink bg-white p-5 shadow-comic">
      <UUser v-if="userData" :name="userData.name" :description="userData.email" :avatar="{ src: userData.avatar, alt: userData.name }" size="xl" />

      <form class="mt-5 space-y-4" @submit.prevent="canSave && save()">
        <UFormField :label="translate('features.account.name')" required>
          <UInput v-model="form.name" class="w-full" autocomplete="name" />
        </UFormField>
        <UFormField
          :label="translate('features.account.phone')"
          :help="translate('features.account.phone_help')"
          :error="phoneValid ? undefined : translate('features.account.phone_invalid')"
        >
          <UInput v-model="form.phone" type="tel" inputmode="tel" placeholder="08xxxxxxxxxx" class="w-full" autocomplete="tel" />
        </UFormField>
        <UFormField :label="translate('features.account.profession')">
          <USelect v-model="form.profession" :items="professionItems" :placeholder="translate('features.account.profession_placeholder')" class="w-full" />
        </UFormField>
        <div class="flex flex-wrap gap-2">
          <UButton
            type="submit"
            :label="translate('features.account.save')"
            color="secondary"
            class="btn-comic text-ortic-ink"
            :loading="isPending"
            :disabled="!canSave"
          />
          <UButton v-if="isDirty" :label="translate('features.account.reset')" color="neutral" variant="ghost" @click="fill" />
        </div>
      </form>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton :to="{ name: OrdersPageName.ORDERS }" :label="translate('features.account.orders')" icon="i-lucide-package" color="neutral" variant="outline" />
      <UButton :label="translate('features.account.logout')" icon="i-lucide-log-out" color="error" variant="soft" @click="authStore.handleLogout()" />
    </div>
  </section>
</template>
