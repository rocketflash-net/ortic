<script setup lang="ts">
import { keepPreviousData, useQuery } from "@tanstack/vue-query"
import { computed, ref } from "vue"

import { CatalogPageName } from "@/features/catalog/models"
import { translate } from "@/plugins/language"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { useDateFormatter } from "@/shared/composables/useDateFormatter"
import { formatCurrency } from "@/shared/helpers/number"

import OrderStatusBadge from "../components/OrderStatusBadge.vue"
import { OrdersPageName } from "../models"
import { getOrders, orderQueryKeys } from "../services/api"

/** Buyer orders, newest first. Each row opens the order (and its QRIS while unpaid). */
const { formatDateTime } = useDateFormatter()
const page = ref(1)

const ordersQuery = useQuery({
  queryKey: computed(() => orderQueryKeys.list(page.value)),
  queryFn: () => getOrders(page.value),
  placeholderData: keepPreviousData,
})
const orders = computed(() => ordersQuery.data.value?.data ?? [])
const total = computed(() => ordersQuery.data.value?.additionalInfo.pagination.total ?? 0)
</script>

<template>
  <section class="mx-auto max-w-3xl px-4 py-8">
    <h1 class="font-display text-4xl tracking-wide text-ortic-ink sm:text-5xl">{{ translate("features.orders.title") }}</h1>

    <QueryErrorAlert v-if="ordersQuery.isError.value" class="mt-6" :title="translate('features.orders.load_error')" :error="ordersQuery.error.value" @retry="ordersQuery.refetch()" />

    <div v-else-if="ordersQuery.isPending.value" class="mt-6 space-y-3">
      <USkeleton v-for="n in 3" :key="n" class="h-20 w-full rounded-xl" />
    </div>

    <div v-else-if="orders.length === 0" class="mt-8 rounded-xl border-2 border-dashed border-ortic-ink/40 p-10 text-center">
      <UIcon name="i-lucide-package" class="size-10 text-zinc-400" />
      <p class="mt-3 font-semibold text-ortic-ink">{{ translate("features.orders.empty_title") }}</p>
      <p class="text-sm text-muted">{{ translate("features.orders.empty_description") }}</p>
      <UButton :to="{ name: CatalogPageName.PRODUCTS }" :label="translate('features.orders.shop')" color="secondary" class="btn-comic mt-4 text-ortic-ink" />
    </div>

    <template v-else>
      <ul class="mt-6 space-y-3">
        <li v-for="order in orders" :key="order.code">
          <RouterLink
            :to="{ name: OrdersPageName.ORDER, params: { code: order.code } }"
            class="flex items-center gap-3 rounded-xl border-2 border-ortic-ink bg-white p-3 shadow-comic transition-transform hover:-translate-y-0.5"
          >
            <div class="size-14 shrink-0 overflow-hidden rounded-lg border-2 border-ortic-ink/15 bg-ortic-50">
              <img v-if="order.first_item?.image_url" :src="order.first_item.image_url" alt="" class="size-full object-contain p-1" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-ortic-ink">{{ order.first_item?.product_name }}</p>
              <p class="text-sm text-muted">{{ order.code }} · {{ translate("features.orders.items", { count: order.item_count }) }}</p>
              <p class="text-xs text-muted">{{ formatDateTime(order.created_at) }}</p>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1">
              <OrderStatusBadge :status="order.status" />
              <p class="font-bold text-ortic-ink">{{ formatCurrency(order.total) }}</p>
            </div>
          </RouterLink>
        </li>
      </ul>
      <div v-if="total > 20" class="mt-6 flex justify-center">
        <UPagination v-model:page="page" :total="total" :items-per-page="20" />
      </div>
    </template>
  </section>
</template>
