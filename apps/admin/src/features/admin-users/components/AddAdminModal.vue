<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { computed, ref } from "vue"

import { customerQueryKeys } from "@/features/customers/services/api"
import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import { getApiErrorMessage } from "@/shared/helpers/error"

import type { AdminRole } from "../models"
import { addAdminUser, adminUserQueryKeys } from "../services/api"

/**
 * Grants admin access to an email. Opened through `useOverlay`.
 *
 * @remarks
 * The email does not need an account yet: the API creates one, and that person signs in with OTP or Google.
 */
const emit = defineEmits<{ close: [saved?: boolean] }>()

const queryClient = useQueryClient()
const { showToast } = useAppToast()

const email = ref("")
const role = ref<AdminRole>("admin")

const roleOptions: { label: string; description: string; value: AdminRole }[] = [
  { label: translate("features.adminUsers.roles.admin"), description: translate("features.adminUsers.roles.admin_help"), value: "admin" },
  { label: translate("features.adminUsers.roles.superadmin"), description: translate("features.adminUsers.roles.superadmin_help"), value: "superadmin" },
]

// The API validates the address; this only keeps the button off until something email-shaped is typed.
const isValid = computed(() => /^\S+@\S+\.\S+$/.test(email.value.trim()))

const { mutate, isPending } = useMutation({
  mutationFn: () => addAdminUser(email.value.trim(), role.value),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: adminUserQueryKeys.all })
    // The customer list shows each user's role.
    queryClient.invalidateQueries({ queryKey: customerQueryKeys.all })
    showToast.success({ title: translate("features.adminUsers.form.created") })
    emit("close", true)
  },
  onError: (error) => {
    showToast.error({
      title: translate("features.adminUsers.form.error_title"),
      description: getApiErrorMessage(error, translate("utils.common.load_error")),
    })
  },
})
</script>

<template>
  <UModal :title="translate('features.adminUsers.form.title')" :close="{ onClick: () => emit('close') }">
    <template #body>
      <form id="add-admin-form" class="space-y-4" @submit.prevent="isValid && mutate()">
        <UFormField
          :label="translate('features.adminUsers.form.email_label')"
          :description="translate('features.adminUsers.form.email_help')"
          required
        >
          <UInput v-model="email" type="email" autocomplete="off" class="w-full" />
        </UFormField>
        <UFormField :label="translate('features.adminUsers.form.role_label')" required>
          <URadioGroup v-model="role" :items="roleOptions" variant="card" />
        </UFormField>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton :label="translate('utils.common.cancel')" color="neutral" variant="ghost" @click="emit('close')" />
        <UButton
          type="submit"
          form="add-admin-form"
          :label="translate('features.adminUsers.add')"
          :loading="isPending"
          :disabled="!isValid"
        />
      </div>
    </template>
  </UModal>
</template>
