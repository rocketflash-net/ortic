<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { ref } from "vue"

import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import { getApiErrorMessage } from "@/shared/helpers/error"

import { markOrderRefunded, orderQueryKeys } from "../services/api"

/**
 * Records a manual refund (the Owner transfers the money outside the system). Opened through `useOverlay`.
 */
const { code, amount: defaultAmount } = defineProps<{ code: string; amount: number }>()
const emit = defineEmits<{ close: [done?: boolean] }>()

const queryClient = useQueryClient()
const { showToast } = useAppToast()
const amount = ref<number>(defaultAmount)
const note = ref("")

const { mutate, isPending } = useMutation({
  mutationFn: () => markOrderRefunded(code, { amount: amount.value, note: note.value.trim() || null }),
  onSuccess: (response) => {
    queryClient.setQueryData(orderQueryKeys.detail(code), response)
    queryClient.invalidateQueries({ queryKey: orderQueryKeys.all })
    showToast.success({ title: translate("features.orders.actions.refunded") })
    emit("close", true)
  },
  onError: (error) => showToast.error({ title: translate("features.orders.actions.error"), description: getApiErrorMessage(error) }),
})
</script>

<template>
  <UModal :title="translate('features.orders.refund_modal.title', { code })" :close="{ onClick: () => emit('close') }">
    <template #body>
      <form id="refund-order-form" class="space-y-4" @submit.prevent="mutate()">
        <UFormField :label="translate('features.orders.refund_modal.amount')" required>
          <UInputNumber
            v-model="amount"
            :min="0"
            :step="1000"
            :format-options="{ style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }"
            locale="id-ID"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="translate('features.orders.refund_modal.note')">
          <UInput v-model="note" :placeholder="translate('features.orders.refund_modal.note_placeholder')" :maxlength="255" class="w-full" />
        </UFormField>
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton :label="translate('utils.common.cancel')" color="neutral" variant="ghost" @click="emit('close')" />
        <UButton type="submit" form="refund-order-form" :label="translate('features.orders.refund_modal.confirm')" :loading="isPending" />
      </div>
    </template>
  </UModal>
</template>
