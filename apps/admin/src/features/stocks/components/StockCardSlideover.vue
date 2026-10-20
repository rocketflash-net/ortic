<script setup lang="ts">
import { useInfiniteQuery } from "@tanstack/vue-query"
import { computed, ref } from "vue"

import type { Warehouse } from "@/features/warehouses/models"
import { translate } from "@/plugins/language"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { useDateFormatter } from "@/shared/composables/useDateFormatter"

import type { StockLevel } from "../models"
import { getStockMovements, stockQueryKeys } from "../services/api"

/**
 * Stock card of one variant: every movement (in, sold, rejected, returned, counted, transferred), newest first.
 * Defaults to the warehouse being viewed; users not tied to one warehouse can switch to all warehouses.
 */
const props = defineProps<{ stock: StockLevel; warehouseId: number; warehouses: Warehouse[]; lockWarehouse: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { formatDateTime } = useDateFormatter()
const ALL = 0
const warehouseFilter = ref<number>(props.warehouseId)
const warehouseItems = computed(() => [
  ...(props.lockWarehouse ? [] : [{ label: translate("features.stocks.card.all_warehouses"), value: ALL }]),
  ...props.warehouses
    .filter((warehouse) => !props.lockWarehouse || warehouse.id === props.warehouseId)
    .map((warehouse) => ({ label: warehouse.name, value: warehouse.id })),
])

const movementsQuery = useInfiniteQuery({
  queryKey: computed(() => stockQueryKeys.movements(props.stock.variant_id, warehouseFilter.value || undefined, 0)),
  queryFn: ({ pageParam }) => getStockMovements(props.stock.variant_id, warehouseFilter.value || undefined, pageParam),
  initialPageParam: 1,
  getNextPageParam: (last) => {
    const { page, totalPages } = last.additionalInfo.pagination
    return page < totalPages ? page + 1 : undefined
  },
})

const movements = computed(() => movementsQuery.data.value?.pages.flatMap((page) => page.data ?? []) ?? [])
const productLabel = computed(() => `${[props.stock.product_name, props.stock.variant_name].filter(Boolean).join(" · ")} (${props.stock.sku})`)
</script>

<template>
  <USlideover :title="translate('features.stocks.card.title')" :description="productLabel" :close="{ onClick: () => emit('close') }">
    <template #body>
      <div class="space-y-4">
        <USelect v-if="warehouseItems.length > 1" v-model="warehouseFilter" :items="warehouseItems" class="w-full" />

        <QueryErrorAlert
          v-if="movementsQuery.isError.value"
          :title="translate('features.stocks.card.load_error')"
          :error="movementsQuery.error.value"
          @retry="movementsQuery.refetch()"
        />

        <div v-else-if="movementsQuery.isPending.value" class="flex justify-center py-10">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
        </div>

        <UEmpty v-else-if="!movements.length" icon="i-lucide-scroll-text" :title="translate('features.stocks.card.empty')" variant="naked" />

        <ul v-else class="divide-y divide-default">
          <li v-for="movement in movements" :key="movement.id" class="flex items-start justify-between gap-3 py-3">
            <div class="min-w-0">
              <p class="font-medium text-highlighted">
                {{ translate(`features.stocks.movement.${movement.type}`) }}
                <span v-if="warehouseFilter === ALL" class="text-sm font-normal text-muted">· {{ movement.warehouse_code }}</span>
              </p>
              <p class="text-sm text-muted">
                {{ formatDateTime(movement.created_at) }}
                <template v-if="movement.reference_id"> · {{ movement.reference_id }}</template>
                <template v-if="movement.actor_name"> · {{ translate("features.stocks.card.by", { name: movement.actor_name }) }}</template>
              </p>
              <p v-if="movement.note" class="text-sm text-toned">{{ movement.note }}</p>
            </div>
            <span class="shrink-0 font-semibold tabular-nums" :class="movement.quantity >= 0 ? 'text-success' : 'text-error'">
              {{ movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity }}
            </span>
          </li>
        </ul>

        <UButton
          v-if="movementsQuery.hasNextPage.value"
          :label="translate('features.stocks.card.more')"
          color="neutral"
          variant="outline"
          block
          :loading="movementsQuery.isFetchingNextPage.value"
          @click="movementsQuery.fetchNextPage()"
        />
      </div>
    </template>
  </USlideover>
</template>
