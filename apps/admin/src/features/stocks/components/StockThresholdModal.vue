<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { computed, ref } from "vue"

import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import { getApiErrorMessage } from "@/shared/helpers/error"

import type { StockLevel } from "../models"
import { stockQueryKeys, updateStockThreshold } from "../services/api"

/** Low-stock threshold of one variant in one warehouse. */
const props = defineProps<{ stock: StockLevel; warehouseId: number }>()
const emit = defineEmits<{ close: [saved?: boolean] }>()

const queryClient = useQueryClient()
const { showToast } = useAppToast()

const threshold = ref<number | undefined>(props.stock.low_stock_threshold)
const isValid = computed(() => threshold.value !== undefined && threshold.value !== null && threshold.value >= 0)

const { mutate, isPending } = useMutation({
  mutationFn: () => updateStockThreshold({ warehouse_id: props.warehouseId, variant_id: props.stock.variant_id, low_stock_threshold: threshold.value! }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: stockQueryKeys.all })
    showToast.success({ title: translate("features.stocks.threshold.saved") })
    emit("close", true)
  },
  onError: (error) => showToast.error({ title: translate("features.stocks.threshold.error"), description: getApiErrorMessage(error, translate("utils.common.load_error")) }),
})
</script>

<template>
  <UModal
    :title="translate('features.stocks.threshold.title')"
    :description="[stock.product_name, stock.variant_name].filter(Boolean).join(' · ')"
    :close="{ onClick: () => emit('close') }"
  >
    <template #body>
      <form id="stock-threshold-form" @submit.prevent="isValid && mutate()">
        <UFormField :label="translate('features.stocks.threshold.label')" :description="translate('features.stocks.threshold.help')" required>
          <UInputNumber v-model="threshold" :min="0" :max="100000" class="w-full" autofocus />
        </UFormField>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton :label="translate('utils.common.cancel')" color="neutral" variant="ghost" @click="emit('close')" />
        <UButton type="submit" form="stock-threshold-form" :label="translate('utils.common.save')" :loading="isPending" :disabled="!isValid" />
      </div>
    </template>
  </UModal>
</template>
