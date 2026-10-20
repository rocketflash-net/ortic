<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query"
import { computed } from "vue"

import { StocksPageName } from "@/features/stocks/models"
import { translate } from "@/plugins/language"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { formatCurrency, formatNumber } from "@/shared/helpers/number"
import { Permission } from "@/shared/models/access"
import { useAccessStore } from "@/shared/stores/useAccessStore"

import type { StockReportItem } from "../models"
import { getStockReport, reportQueryKeys } from "../services/api"

/** Stock report: units, SKUs, low/out counts and (Owner) stock value per warehouse, plus low and out-of-stock lists. */
const accessStore = useAccessStore()
const canOpenStock = computed(() => accessStore.hasPermission(Permission.STOCKS_MANAGE))

const reportQuery = useQuery({ queryKey: reportQueryKeys.stock, queryFn: getStockReport, select: (response) => response.data! })
const report = computed(() => reportQuery.data.value)

const lists = computed<{ key: "low" | "out"; title: string; empty: string; items: StockReportItem[] }[]>(() => [
  { key: "low", title: translate("features.reports.stock.low_title"), empty: translate("features.reports.stock.empty_low"), items: report.value?.low_stock ?? [] },
  { key: "out", title: translate("features.reports.stock.out_title"), empty: translate("features.reports.stock.empty_out"), items: report.value?.out_of_stock ?? [] },
])
</script>

<template>
  <UDashboardPanel id="stock-report">
    <template #header>
      <UDashboardNavbar :title="translate('features.reports.stock.page_title')">
        <template #right>
          <UButton v-if="canOpenStock" :label="translate('features.reports.stock.open_stock')" icon="i-lucide-boxes" color="neutral" variant="outline" :to="{ name: StocksPageName.STOCKS }" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UAlert color="neutral" variant="subtle" icon="i-lucide-info" :description="translate('features.reports.stock.description')" class="shrink-0" />

      <QueryErrorAlert v-if="reportQuery.isError.value" :title="translate('features.reports.stock.load_error')" :error="reportQuery.error.value" @retry="reportQuery.refetch()" />

      <div v-else-if="!report" class="flex justify-center py-16">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
      </div>

      <template v-else>
        <div class="grid shrink-0 gap-4 lg:grid-cols-2">
          <UCard v-for="warehouse in report.warehouses" :key="warehouse.warehouse_id">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-warehouse" class="size-5 text-primary" />
                <h2 class="font-semibold text-highlighted">{{ warehouse.warehouse_name }}</h2>
                <UBadge v-if="!warehouse.is_active" :label="translate('features.reports.stock.inactive')" color="neutral" variant="subtle" size="sm" />
              </div>
            </template>
            <dl class="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <dt class="text-sm text-muted">{{ translate("features.reports.stock.units") }}</dt>
                <dd class="text-xl font-semibold text-highlighted tabular-nums">{{ formatNumber(warehouse.units) }}</dd>
              </div>
              <div>
                <dt class="text-sm text-muted">{{ translate("features.reports.stock.sku_in_stock") }}</dt>
                <dd class="text-xl font-semibold text-highlighted tabular-nums">{{ formatNumber(warehouse.sku_in_stock) }}</dd>
              </div>
              <div v-if="warehouse.value !== null">
                <dt class="text-sm text-muted">{{ translate("features.reports.stock.value") }}</dt>
                <dd class="text-xl font-semibold text-highlighted tabular-nums">{{ formatCurrency(warehouse.value) }}</dd>
              </div>
              <div>
                <dt class="text-sm text-muted">{{ translate("features.reports.stock.low") }}</dt>
                <dd class="text-xl font-semibold tabular-nums" :class="warehouse.low_count ? 'text-warning' : 'text-highlighted'">{{ formatNumber(warehouse.low_count) }}</dd>
              </div>
              <div>
                <dt class="text-sm text-muted">{{ translate("features.reports.stock.out") }}</dt>
                <dd class="text-xl font-semibold tabular-nums" :class="warehouse.out_count ? 'text-error' : 'text-highlighted'">{{ formatNumber(warehouse.out_count) }}</dd>
              </div>
            </dl>
          </UCard>
        </div>

        <div class="grid shrink-0 items-start gap-6 lg:grid-cols-2">
          <UCard v-for="list in lists" :key="list.key">
            <template #header>
              <div class="flex items-center justify-between gap-2">
                <h2 class="font-semibold text-highlighted">{{ list.title }}</h2>
                <UButton
                  v-if="canOpenStock && list.items.length"
                  icon="i-lucide-arrow-right"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  :to="{ name: StocksPageName.STOCKS, query: { level: list.key } }"
                  :aria-label="translate('features.reports.stock.open_stock')"
                />
              </div>
            </template>
            <UEmpty v-if="!list.items.length" icon="i-lucide-circle-check" :title="list.empty" variant="naked" />
            <table v-else class="w-full text-sm">
              <thead class="text-left text-muted">
                <tr>
                  <th class="pb-2 font-medium">{{ translate("features.reports.stock.product") }}</th>
                  <th class="pb-2 text-right font-medium">{{ translate("features.reports.stock.available") }}</th>
                  <th class="pb-2 text-right font-medium">{{ translate("features.reports.stock.threshold") }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr v-for="item in list.items" :key="`${item.warehouse_id}-${item.variant_id}`">
                  <td class="py-2 pe-3">
                    <p class="text-highlighted">{{ item.product_name }}</p>
                    <p class="text-xs text-muted">{{ [item.variant_name, item.sku, report.warehouses.length > 1 ? item.warehouse_name : null].filter(Boolean).join(" · ") }}</p>
                  </td>
                  <td class="py-2 text-right font-medium tabular-nums" :class="list.key === 'out' ? 'text-error' : 'text-warning'">{{ formatNumber(item.available) }}</td>
                  <td class="py-2 text-right text-muted tabular-nums">{{ formatNumber(item.low_stock_threshold) }}</td>
                </tr>
              </tbody>
            </table>
          </UCard>
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>
