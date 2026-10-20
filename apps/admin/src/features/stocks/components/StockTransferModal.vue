<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { computed, ref } from "vue"

import type { Warehouse } from "@/features/warehouses/models"
import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import { getApiErrorMessage } from "@/shared/helpers/error"

import type { StockLevel } from "../models"
import { stockQueryKeys, transferStock } from "../services/api"

/**
 * Moves available stock of one variant to another warehouse (transfer_out at the source, transfer_in at the target).
 */
const props = defineProps<{ stock: StockLevel; warehouseId: number; warehouses: Warehouse[] }>()
const emit = defineEmits<{ close: [saved?: boolean] }>()

const queryClient = useQueryClient()
const { showToast } = useAppToast()

const source = computed(() => props.warehouses.find((warehouse) => warehouse.id === props.warehouseId))
const targetItems = computed(() =>
  props.warehouses.filter((warehouse) => warehouse.id !== props.warehouseId).map((warehouse) => ({ label: warehouse.name, value: warehouse.id })),
)

const target = ref<number | undefined>(targetItems.value[0]?.value)
const quantity = ref<number | undefined>()
const note = ref("")

const isValid = computed(
  () => target.value !== undefined && quantity.value !== undefined && quantity.value !== null && quantity.value >= 1 && quantity.value <= props.stock.available,
)

const { mutate, isPending } = useMutation({
  mutationFn: () =>
    transferStock({
      from_warehouse_id: props.warehouseId,
      to_warehouse_id: target.value!,
      variant_id: props.stock.variant_id,
      quantity: quantity.value!,
      note: note.value.trim() || null,
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: stockQueryKeys.all })
    showToast.success({ title: translate("features.stocks.transfer.saved") })
    emit("close", true)
  },
  onError: (error) => showToast.error({ title: translate("features.stocks.transfer.error"), description: getApiErrorMessage(error, translate("utils.common.load_error")) }),
})

const productLabel = computed(() => [props.stock.product_name, props.stock.variant_name].filter(Boolean).join(" · "))
</script>

<template>
  <UModal :title="translate('features.stocks.transfer.title')" :description="`${productLabel} (${stock.sku})`" :close="{ onClick: () => emit('close') }">
    <template #body>
      <UAlert v-if="!targetItems.length" color="warning" variant="subtle" icon="i-lucide-warehouse" :description="translate('features.stocks.transfer.no_target')" />
      <form v-else id="stock-transfer-form" class="space-y-4" @submit.prevent="isValid && mutate()">
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="translate('features.stocks.transfer.from')">
            <p class="rounded-md bg-elevated px-3 py-2 text-highlighted">{{ source?.name ?? "–" }}</p>
          </UFormField>
          <UFormField :label="translate('features.stocks.transfer.to')" required>
            <USelect v-model="target" :items="targetItems" :placeholder="translate('features.stocks.transfer.to_placeholder')" class="w-full" />
          </UFormField>
        </div>
        <UFormField :label="translate('features.stocks.transfer.quantity')" :description="translate('features.stocks.transfer.available', { available: stock.available })" required>
          <UInputNumber v-model="quantity" :min="1" :max="Math.max(stock.available, 1)" class="w-full" />
        </UFormField>
        <UFormField :label="translate('features.stocks.transfer.note')">
          <UInput v-model="note" maxlength="255" class="w-full" />
        </UFormField>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton :label="translate('utils.common.cancel')" color="neutral" variant="ghost" @click="emit('close')" />
        <UButton
          v-if="targetItems.length"
          type="submit"
          form="stock-transfer-form"
          :label="translate('features.stocks.transfer.submit')"
          :loading="isPending"
          :disabled="!isValid"
        />
      </div>
    </template>
  </UModal>
</template>
