<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query"
import { useHead } from "@unhead/vue"
import { computed } from "vue"

import { getWarehouses, warehouseQueryKeys } from "@/features/warehouses/services/api"
import axiosInstance from "@/plugins/axios"
import { translate } from "@/plugins/language"
import BrandLogo from "@/shared/components/BrandLogo.vue"
import { formatCurrency, formatNumber } from "@/shared/helpers/number"
import type { BackendResponse, CustomAxiosRequestConfig } from "@/shared/models/api"

import { getOrder, orderQueryKeys } from "../services/api"

/**
 * Printable shipping label (A6-ish, black on white) opened in a new tab from the order detail. Prints itself through
 * the browser's print dialog; the toolbar is hidden when printing.
 */
const { code } = defineProps<{ code: string }>()

useHead({ title: computed(() => translate("features.orders.label.title", { code })) })

type StoreInfo = { store_name: string; store_whatsapp: string }

const orderQuery = useQuery({ queryKey: computed(() => orderQueryKeys.detail(code)), queryFn: () => getOrder(code), select: (response) => response.data })
const warehousesQuery = useQuery({ queryKey: warehouseQueryKeys.all, queryFn: getWarehouses, select: (response) => response.data ?? [] })
const storeQuery = useQuery({
  queryKey: ["store-info"],
  queryFn: async () => {
    const config: CustomAxiosRequestConfig = { url: "/catalog/store", method: "GET", meta: { requiresAuth: false } }
    const { data } = await axiosInstance.request<BackendResponse<StoreInfo>>(config)
    return data.data
  },
})

const order = computed(() => orderQuery.data.value ?? null)
const warehouse = computed(() => warehousesQuery.data.value?.find((item) => item.id === order.value?.warehouse?.id) ?? null)
const senderPhone = computed(() => warehouse.value?.pic_phone || storeQuery.data.value?.store_whatsapp || "")
const print = () => window.print()
</script>

<template>
  <div class="min-h-dvh bg-white text-black print:min-h-0">
    <div class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 print:hidden">
      <p class="font-medium">{{ translate("features.orders.label.title", { code }) }}</p>
      <UButton :label="translate('features.orders.label.print')" icon="i-lucide-printer" :disabled="!order" @click="print" />
    </div>

    <div v-if="!order" class="p-6 print:hidden"><USkeleton class="h-96 w-full max-w-md" /></div>

    <article v-else class="label mx-auto my-6 w-full max-w-[105mm] border-2 border-black text-[12px] leading-snug print:my-0">
      <header class="flex items-center justify-between border-b-2 border-black p-2">
        <div class="flex items-center gap-2">
          <BrandLogo class="size-8" />
          <span class="text-base font-bold">{{ storeQuery.data.value?.store_name ?? "Ortic" }}</span>
        </div>
        <div class="text-right">
          <p class="text-lg font-black uppercase">{{ order.courier.name }}</p>
          <p class="font-semibold uppercase">{{ order.courier.service_name }}</p>
        </div>
      </header>

      <section class="border-b-2 border-black p-2 text-center">
        <p class="text-[10px] uppercase">{{ translate("features.orders.label.waybill") }}</p>
        <p v-if="order.shipment.waybill_id" class="font-mono text-2xl font-black tracking-wider break-all">{{ order.shipment.waybill_id }}</p>
        <p v-else class="font-semibold">{{ translate("features.orders.label.no_waybill") }}</p>
      </section>

      <section class="grid grid-cols-2 border-b-2 border-black">
        <div class="border-e-2 border-black p-2">
          <p class="text-[10px] font-bold uppercase">{{ translate("features.orders.label.from") }}</p>
          <p class="font-semibold">{{ warehouse?.pic_name || storeQuery.data.value?.store_name || "Ortic" }}</p>
          <p v-if="senderPhone">{{ senderPhone }}</p>
          <p v-if="warehouse">{{ warehouse.address }}</p>
          <p v-if="warehouse">{{ [warehouse.district, warehouse.city, warehouse.postal_code].filter(Boolean).join(", ") }}</p>
          <p v-else-if="order.warehouse">{{ order.warehouse.name }}, {{ order.warehouse.city }}</p>
        </div>
        <div class="p-2">
          <p class="text-[10px] font-bold uppercase">{{ translate("features.orders.label.to") }}</p>
          <p class="text-sm font-bold">{{ order.recipient.name }}</p>
          <p>{{ order.recipient.phone }}</p>
          <p>{{ order.recipient.address }}</p>
          <p>{{ [order.recipient.district, order.recipient.city, order.recipient.province].join(", ") }}</p>
          <p class="font-semibold">{{ order.recipient.postal_code }}</p>
          <p v-if="order.recipient.notes" class="italic">{{ order.recipient.notes }}</p>
        </div>
      </section>

      <section class="grid grid-cols-2 border-b-2 border-black">
        <div class="border-e-2 border-black p-2">
          <p class="text-[10px] uppercase">{{ translate("features.orders.label.order") }}</p>
          <p class="font-mono font-bold">{{ order.code }}</p>
        </div>
        <div class="p-2">
          <p class="text-[10px] uppercase">{{ translate("features.orders.label.weight") }}</p>
          <p class="font-bold">{{ formatNumber(order.weight_gram) }} g</p>
          <p v-if="order.insured_value" class="text-[10px]">{{ translate("features.orders.label.insured", { amount: formatCurrency(order.insured_value) }) }}</p>
        </div>
      </section>

      <section class="p-2">
        <p class="text-[10px] font-bold uppercase">{{ translate("features.orders.label.items") }}</p>
        <ul>
          <li v-for="item in order.items" :key="item.sku" class="flex justify-between gap-2">
            <span>{{ item.product_name }}<span v-if="item.variant_name"> ({{ item.variant_name }})</span></span>
            <span class="shrink-0 font-semibold">× {{ item.quantity }}</span>
          </li>
        </ul>
      </section>
    </article>
  </div>
</template>

<style scoped>
@media print {
  @page {
    size: 105mm 148mm;
    margin: 4mm;
  }
  .label {
    max-width: none;
  }
}
</style>
