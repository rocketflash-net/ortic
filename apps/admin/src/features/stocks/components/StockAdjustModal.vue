<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { computed, ref } from "vue"

import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import { getApiErrorMessage, getApiFieldErrors } from "@/shared/helpers/error"

import type { StockLevel } from "../models"
import { adjustStock, stockQueryKeys } from "../services/api"

/**
 * Stock in (+quantity received) or stock count (on-hand replaced by the counted number). Opened through `useOverlay`.
 */
const props = defineProps<{ stock: StockLevel; warehouseId: number; type: "stock_in" | "adjustment" }>()
const emit = defineEmits<{ close: [saved?: boolean] }>()

const queryClient = useQueryClient()
const { showToast } = useAppToast()

const quantity = ref<number | undefined>(props.type === "adjustment" ? props.stock.quantity : undefined)
const note = ref("")
const fieldError = ref<string>()

const hasQuantity = computed(() => quantity.value !== undefined && quantity.value !== null)
const resultQuantity = computed(() => {
  if (!hasQuantity.value) return undefined
  return props.type === "stock_in" ? props.stock.quantity + quantity.value! : quantity.value!
})
const isValid = computed(() => {
  if (!hasQuantity.value) return false
  return props.type === "stock_in" ? quantity.value! > 0 : quantity.value! >= props.stock.reserved
})

const { mutate, isPending } = useMutation({
  mutationFn: () =>
    adjustStock({ warehouse_id: props.warehouseId, variant_id: props.stock.variant_id, type: props.type, quantity: quantity.value!, note: note.value.trim() || null }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: stockQueryKeys.all })
    showToast.success({ title: translate("features.stocks.adjust.saved") })
    emit("close", true)
  },
  onError: (error) => {
    fieldError.value = getApiFieldErrors(error).find((item) => item.field === "quantity")?.message
    showToast.error({ title: translate("features.stocks.adjust.error"), description: getApiErrorMessage(error, translate("utils.common.load_error")) })
  },
})

const productLabel = computed(() => [props.stock.product_name, props.stock.variant_name].filter(Boolean).join(" · "))
const title = computed(() => (props.type === "stock_in" ? translate("features.stocks.adjust.stock_in_title") : translate("features.stocks.adjust.adjustment_title")))
</script>

<template>
  <UModal :title="title" :description="`${productLabel} (${stock.sku})`" :close="{ onClick: () => emit('close') }">
    <template #body>
      <form id="stock-adjust-form" class="space-y-4" @submit.prevent="isValid && mutate()">
        <p class="text-sm text-muted">{{ translate("features.stocks.adjust.current", { quantity: stock.quantity, reserved: stock.reserved }) }}</p>
        <UFormField
          :label="type === 'stock_in' ? translate('features.stocks.adjust.stock_in_quantity') : translate('features.stocks.adjust.adjustment_quantity')"
          :description="type === 'adjustment' ? translate('features.stocks.adjust.adjustment_help', { reserved: stock.reserved }) : undefined"
          :error="fieldError"
          required
        >
          <UInputNumber v-model="quantity" :min="type === 'stock_in' ? 1 : stock.reserved" :max="1000000" class="w-full" autofocus />
        </UFormField>
        <p v-if="resultQuantity !== undefined" class="text-sm font-medium text-highlighted">{{ translate("features.stocks.adjust.result", { quantity: resultQuantity }) }}</p>
        <UFormField :label="translate('features.stocks.adjust.note')">
          <UInput v-model="note" maxlength="255" :placeholder="translate('features.stocks.adjust.note_placeholder')" class="w-full" />
        </UFormField>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton :label="translate('utils.common.cancel')" color="neutral" variant="ghost" @click="emit('close')" />
        <UButton type="submit" form="stock-adjust-form" :label="translate('utils.common.save')" :loading="isPending" :disabled="!isValid" />
      </div>
    </template>
  </UModal>
</template>
