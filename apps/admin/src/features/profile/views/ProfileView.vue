<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui"
import { useMutation } from "@tanstack/vue-query"
import { storeToRefs } from "pinia"
import { computed, reactive, watch } from "vue"

import { useAuthStore } from "@/features/authentication/stores/authentication.store"
import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import { getApiErrorMessage } from "@/shared/helpers/error"

import { type ProfileForm, profileSchema } from "../schemas/profile.schema"
import { updateProfile } from "../services/api"

const authStore = useAuthStore()
const { userData } = storeToRefs(authStore)
const { showToast } = useAppToast()

const state = reactive({ name: userData.value?.name ?? "" })
// Keep the field in sync when the session loads after the page (or another tab saves a new name).
watch(
  () => userData.value?.name,
  (name) => {
    state.name = name ?? ""
  },
)

const isDirty = computed(() => state.name.trim() !== (userData.value?.name ?? ""))

const { mutate: saveProfile, isPending } = useMutation({
  mutationFn: updateProfile,
  onSuccess: (response) => {
    if (response.data) authStore.setUser(response.data)
    showToast.success({ title: translate("features.profile.form.saved") })
  },
  onError: (error) => {
    showToast.error({
      title: translate("features.profile.form.save_error_title"),
      description: getApiErrorMessage(error, translate("utils.common.load_error")),
    })
  },
})

const onSubmit = (event: FormSubmitEvent<ProfileForm>) => saveProfile({ name: event.data.name })
</script>

<template>
  <UDashboardPanel id="profile">
    <template #header>
      <UDashboardNavbar :title="translate('features.profile.page_title')" />
    </template>

    <template #body>
      <div v-if="userData" class="grid w-full items-start gap-6 lg:grid-cols-3 lg:gap-8">
        <UCard class="lg:sticky lg:top-0" :ui="{ body: 'flex flex-col items-center gap-3 p-6 text-center sm:p-6' }">
          <UAvatar :src="userData.avatar" :alt="userData.name" size="3xl" class="size-20 text-2xl" />
          <div class="w-full min-w-0">
            <p class="truncate text-lg font-semibold text-highlighted">{{ userData.name }}</p>
            <p class="truncate text-sm text-muted">{{ userData.email }}</p>
          </div>
          <UBadge
            :label="userData.role"
            :aria-label="`${translate('features.profile.account.role')}: ${userData.role}`"
            color="secondary"
            variant="subtle"
            class="capitalize"
          />
        </UCard>

        <div class="space-y-6 lg:col-span-2 lg:space-y-8">
          <UCard as="section" aria-labelledby="profile-form-title" :ui="{ header: 'p-4 sm:px-5', body: 'p-4 sm:p-5' }">
            <template #header>
              <h2 id="profile-form-title" class="font-semibold text-highlighted">
                {{ translate("features.profile.form.title") }}
              </h2>
              <p class="text-sm text-muted">{{ translate("features.profile.form.description") }}</p>
            </template>

            <UForm :schema="profileSchema" :state="state" class="space-y-2" @submit="onSubmit">
              <div class="grid gap-x-4 sm:grid-cols-2">
                <UFormField :label="translate('features.profile.form.name_label')" name="name" required>
                  <UInput v-model="state.name" autocomplete="name" />
                </UFormField>

                <UFormField
                  :label="translate('features.profile.form.email_label')"
                  name="email"
                  :help="translate('features.profile.form.email_help')"
                >
                  <UInput :model-value="userData.email" type="email" disabled />
                </UFormField>
              </div>

              <div class="flex justify-end">
                <UButton
                  type="submit"
                  :label="translate('features.profile.form.save')"
                  :loading="isPending"
                  :disabled="!isDirty"
                  class="w-full justify-center sm:w-auto"
                />
              </div>
            </UForm>
          </UCard>

          <UCard as="section" aria-labelledby="profile-session-title" :ui="{ body: 'p-4 sm:p-5' }">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="profile-session-title" class="font-semibold text-highlighted">
                  {{ translate("features.profile.session.title") }}
                </h2>
                <p class="text-sm text-muted">{{ translate("features.profile.session.description") }}</p>
              </div>
              <UButton
                :label="translate('features.profile.session.logout')"
                icon="i-lucide-log-out"
                color="error"
                variant="outline"
                class="w-full justify-center sm:w-auto"
                @click="authStore.handleLogout()"
              />
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
