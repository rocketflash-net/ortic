<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { computed, ref } from "vue"

import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import { getApiErrorMessage } from "@/shared/helpers/error"

import { orderQueryKeys, rejectOrder } from "../services/api"

/**
 * Rejects an order with a reason that is shown to the buyer. Opened through `useOverlay`; closes with `true` on success.
 */
const { code } = defineProps<{ code: string }>()
const emit = defineEmits<{ close: [done?: boolean] }>()

const queryClient = useQueryClient()
const { showToast } = useAppToast()
const reason = ref("")
const isValid = computed(() => reason.value.trim().length >= 3)

const { mutate, isPending } = useMutation({
  mutationFn: () => rejectOrder(code, reason.value.trim()),
  onSuccess: (response) => {
    queryClient.setQueryData(orderQueryKeys.detail(code), response)
    queryClient.invalidateQueries({ queryKey: orderQueryKeys.all })
    showToast.success({ title: translate("features.orders.actions.rejected") })
    emit("close", true)
  },
  onError: (error) => showToast.error({ title: translate("features.orders.actions.error"), description: getApiErrorMessage(error) }),
})
</script>

<template>
  <UModal
    :title="translate('features.orders.reject_modal.title', { code })"
    :description="translate('features.orders.reject_modal.description')"
    :close="{ onClick: () => emit('close') }"
  >
    <template #body>
      <form id="reject-order-form" @submit.prevent="isValid && mutate()">
        <UFormField :label="translate('features.orders.reject_modal.reason')" required>
          <UTextarea v-model="reason" :placeholder="translate('features.orders.reject_modal.reason_placeholder')" :maxlength="255" autoresize class="w-full" autofocus />
        </UFormField>
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton :label="translate('utils.common.cancel')" color="neutral" variant="ghost" @click="emit('close')" />
        <UButton type="submit" form="reject-order-form" :label="translate('features.orders.reject_modal.confirm')" color="error" :loading="isPending" :disabled="!isValid" />
      </div>
    </template>
  </UModal>
</template>
