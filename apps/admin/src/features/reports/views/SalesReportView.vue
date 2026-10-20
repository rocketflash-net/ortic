<script setup lang="ts">
import { ORDER_STATUS_LABELS, type OrderStatusType } from "@ortic/shared"
import { keepPreviousData, useMutation, useQuery } from "@tanstack/vue-query"
import { VisArea, VisAxis, VisCrosshair, VisLine, VisTooltip, VisXYContainer } from "@unovis/vue"
import { computed } from "vue"

import { getWarehouses, warehouseQueryKeys } from "@/features/warehouses/services/api"
import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import DateRangeFilter from "@/shared/components/DateRangeFilter.vue"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { useRouteQueryState } from "@/shared/composables/useRouteQueryState"
import { saveBlob } from "@/shared/helpers/download"
import { getApiErrorMessage } from "@/shared/helpers/error"
import { formatCurrency, formatNumber } from "@/shared/helpers/number"
import { integerParam, stringParam } from "@/shared/helpers/query-param"

import type { ReportParams, SalesReport } from "../models"
import { downloadOrdersCsv, getSalesReport, reportQueryKeys } from "../services/api"

/**
 * Sales report: period & warehouse filters in the URL, KPI tiles (profit after MDR for the Owner), daily chart,
 * best sellers, per-warehouse split, order statuses, refunds, and the order CSV for bookkeeping.
 */
const { showToast } = useAppToast()

const DATE = /^\d{4}-\d{2}-\d{2}$/
const { date_from: dateFrom, date_to: dateTo, warehouse_id: warehouseId } = useRouteQueryState({
  date_from: stringParam({ maxLength: 10, pattern: DATE }),
  date_to: stringParam({ maxLength: 10, pattern: DATE }),
  warehouse_id: integerParam({ default: 0, min: 0 }),
})

/** Today in WIB as `YYYY-MM-DD`. */
const wibDay = (offsetDays = 0) => new Date(Date.now() + 7 * 3600_000 + offsetDays * 86400_000).toISOString().slice(0, 10)

const params = computed<ReportParams>(() => ({
  date_from: dateFrom.value || wibDay(-29),
  date_to: dateTo.value || wibDay(),
  warehouse_id: warehouseId.value || undefined,
}))

const presets = computed(() => {
  const today = wibDay()
  return [
    { label: translate("features.reports.sales.presets.today"), from: today, to: today },
    { label: translate("features.reports.sales.presets.last_7"), from: wibDay(-6), to: today },
    { label: translate("features.reports.sales.presets.last_30"), from: wibDay(-29), to: today },
    { label: translate("features.reports.sales.presets.this_month"), from: `${today.slice(0, 8)}01`, to: today },
  ]
})
const applyPreset = (from: string, to: string) => {
  dateFrom.value = from
  dateTo.value = to
}

const warehousesQuery = useQuery({ queryKey: warehouseQueryKeys.all, queryFn: getWarehouses, select: (response) => response.data ?? [] })
const warehouseItems = computed(() => [
  { label: translate("features.reports.sales.all_warehouses"), value: 0 },
  ...(warehousesQuery.data.value ?? []).map((warehouse) => ({ label: warehouse.name, value: warehouse.id })),
])

const reportQuery = useQuery({
  queryKey: computed(() => reportQueryKeys.sales(params.value)),
  queryFn: () => getSalesReport(params.value),
  select: (response) => response.data!,
  placeholderData: keepPreviousData,
})
const report = computed(() => reportQuery.data.value)
const canSeeProfit = computed(() => report.value?.totals.gross_profit !== null && report.value?.totals.gross_profit !== undefined)

const { mutate: download, isPending: isDownloading } = useMutation({
  mutationFn: () => downloadOrdersCsv(params.value),
  onSuccess: (blob) => saveBlob(blob, `pesanan-ortic-${params.value.date_from}-${params.value.date_to}.csv`),
  onError: (error) => showToast.error({ title: translate("features.reports.sales.download_error"), description: getApiErrorMessage(error) }),
})

type Kpi = { label: string; value: string; hint?: string; icon: string; tone?: "success" | "error" }
const kpis = computed<Kpi[]>(() => {
  const totals = report.value?.totals
  if (!totals) return []
  return [
    { label: translate("features.reports.sales.kpi.revenue"), value: formatCurrency(totals.revenue), icon: "i-lucide-wallet" },
    {
      label: translate("features.reports.sales.kpi.orders"),
      value: formatNumber(totals.orders),
      hint: translate("features.reports.sales.kpi.units", { count: formatNumber(totals.units_sold) }),
      icon: "i-lucide-shopping-bag",
    },
    { label: translate("features.reports.sales.kpi.average"), value: formatCurrency(totals.average_order_value), icon: "i-lucide-receipt" },
    { label: translate("features.reports.sales.kpi.items_total"), value: formatCurrency(totals.items_total), icon: "i-lucide-package" },
    { label: translate("features.reports.sales.kpi.shipping"), value: formatCurrency(totals.shipping_total + totals.insurance_total), icon: "i-lucide-truck" },
    { label: translate("features.reports.sales.kpi.service_fee"), value: formatCurrency(totals.service_fee_total), icon: "i-lucide-hand-coins" },
    { label: translate("features.reports.sales.kpi.mdr"), value: formatCurrency(totals.mdr_total), icon: "i-lucide-percent", tone: "error" },
    ...(totals.cost_total !== null ? [{ label: translate("features.reports.sales.kpi.cost"), value: formatCurrency(totals.cost_total), icon: "i-lucide-tag" }] : []),
    ...(totals.gross_profit !== null
      ? [
          {
            label: translate("features.reports.sales.kpi.gross_profit"),
            value: formatCurrency(totals.gross_profit),
            hint: totals.margin_percent !== null ? translate("features.reports.sales.kpi.margin", { value: formatNumber(totals.margin_percent, "id-ID", 1) }) : undefined,
            icon: "i-lucide-trending-up",
            tone: "success" as const,
          },
        ]
      : []),
  ]
})

type Day = SalesReport["daily"][number]
const chartData = computed<Day[]>(() => report.value?.daily ?? [])
const hasSales = computed(() => chartData.value.some((day) => day.orders > 0))
const dayLabel = (date: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))
const x = (_day: Day, index: number) => index
const yRevenue = (day: Day) => day.revenue
const yProfit = (day: Day) => day.gross_profit ?? 0
const tickFormat = (tick: number | Date) => {
  const day = chartData.value[Number(tick)]
  return day ? dayLabel(day.date) : ""
}
const yTickFormat = (tick: number | Date) => (Number(tick) >= 1_000_000 ? `${formatNumber(Number(tick) / 1_000_000, "id-ID", 1)} jt` : `${formatNumber(Number(tick) / 1000)} rb`)
const numTicks = computed(() => Math.min(chartData.value.length, 8))
const crosshairTemplate = (day: Day) =>
  `<div class="text-sm"><b>${dayLabel(day.date)}</b><br>${translate("features.reports.sales.chart.revenue")}: ${formatCurrency(day.revenue)}${
    day.gross_profit !== null ? `<br>${translate("features.reports.sales.chart.profit")}: ${formatCurrency(day.gross_profit)}` : ""
  }<br>${translate("features.reports.sales.chart.orders", { count: day.orders })}</div>`

const statusRows = computed(() =>
  Object.entries(report.value?.status_breakdown ?? {})
    .map(([status, count]) => ({ status, label: ORDER_STATUS_LABELS[status as OrderStatusType] ?? status, count }))
    .sort((a, b) => b.count - a.count),
)
const maxWarehouseRevenue = computed(() => Math.max(1, ...(report.value?.by_warehouse ?? []).map((row) => row.revenue)))
</script>

<template>
  <UDashboardPanel id="sales-report">
    <template #header>
      <UDashboardNavbar :title="translate('features.reports.sales.page_title')">
        <template #right>
          <UButton :label="translate('features.reports.sales.download')" icon="i-lucide-download" color="neutral" variant="outline" :loading="isDownloading" @click="download()" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <div class="flex flex-wrap items-center gap-2 py-1">
          <DateRangeFilter
            :from="params.date_from"
            :to="params.date_to"
            @update:from="(value: string) => (dateFrom = value)"
            @update:to="(value: string) => (dateTo = value)"
          />
          <div class="flex flex-wrap gap-1">
            <UButton v-for="preset in presets" :key="preset.label" :label="preset.label" color="neutral" variant="ghost" size="sm" @click="applyPreset(preset.from, preset.to)" />
          </div>
          <div class="w-52"><USelect v-model="warehouseId" :items="warehouseItems" icon="i-lucide-warehouse" class="w-full" /></div>
        </div>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UAlert color="neutral" variant="subtle" icon="i-lucide-info" :description="translate('features.reports.sales.description')" class="shrink-0" />

      <QueryErrorAlert v-if="reportQuery.isError.value" :title="translate('features.reports.sales.load_error')" :error="reportQuery.error.value" @retry="reportQuery.refetch()" />

      <div v-else-if="!report" class="flex justify-center py-16">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
      </div>

      <template v-else>
        <UAlert v-if="report.totals.profit_incomplete" color="warning" variant="subtle" icon="i-lucide-triangle-alert" :description="translate('features.reports.sales.kpi.profit_incomplete')" class="shrink-0" />

        <div class="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5" :class="{ 'opacity-60': reportQuery.isFetching.value }">
          <UCard v-for="kpi in kpis" :key="kpi.label" :ui="{ body: 'p-4 sm:p-4' }">
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm text-muted">{{ kpi.label }}</p>
              <UIcon :name="kpi.icon" class="size-5 shrink-0 text-dimmed" />
            </div>
            <p class="mt-1 text-xl font-semibold tabular-nums" :class="kpi.tone === 'success' ? 'text-success' : kpi.tone === 'error' ? 'text-error' : 'text-highlighted'">
              {{ kpi.value }}
            </p>
            <p v-if="kpi.hint" class="text-xs text-muted">{{ kpi.hint }}</p>
          </UCard>
        </div>

        <UCard class="shrink-0">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="font-semibold text-highlighted">{{ translate("features.reports.sales.chart.title") }}</h2>
              <div class="flex items-center gap-4 text-xs text-muted">
                <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-primary" />{{ translate("features.reports.sales.chart.revenue") }}</span>
                <span v-if="canSeeProfit" class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-success" />{{ translate("features.reports.sales.chart.profit") }}</span>
              </div>
            </div>
          </template>
          <UEmpty v-if="!hasSales" icon="i-lucide-chart-line" :title="translate('features.reports.sales.chart.empty')" variant="naked" />
          <VisXYContainer v-else :data="chartData" :height="260" :padding="{ top: 8 }">
            <VisArea :x="x" :y="yRevenue" color="var(--ui-primary)" :opacity="0.12" />
            <VisLine :x="x" :y="yRevenue" color="var(--ui-primary)" :line-width="2" />
            <VisLine v-if="canSeeProfit" :x="x" :y="yProfit" color="var(--ui-success)" :line-width="2" />
            <VisAxis type="x" :tick-format="tickFormat" :num-ticks="numTicks" :grid-line="false" />
            <VisAxis type="y" :tick-format="yTickFormat" :num-ticks="4" />
            <VisCrosshair :template="crosshairTemplate" color="var(--ui-primary)" />
            <VisTooltip />
          </VisXYContainer>
        </UCard>

        <div class="grid shrink-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <UCard>
            <template #header>
              <h2 class="font-semibold text-highlighted">{{ translate("features.reports.sales.top.title") }}</h2>
            </template>
            <UEmpty v-if="!report.top_products.length" icon="i-lucide-package" :title="translate('features.reports.sales.top.empty')" variant="naked" />
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="text-left text-muted">
                  <tr>
                    <th class="pb-2 font-medium">{{ translate("features.reports.sales.top.product") }}</th>
                    <th class="pb-2 text-right font-medium">{{ translate("features.reports.sales.top.quantity") }}</th>
                    <th class="pb-2 text-right font-medium">{{ translate("features.reports.sales.top.revenue") }}</th>
                    <th v-if="canSeeProfit" class="pb-2 text-right font-medium">{{ translate("features.reports.sales.top.profit") }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default">
                  <tr v-for="product in report.top_products" :key="`${product.product_id}-${product.product_name}`">
                    <td class="py-2 pe-3 text-highlighted">{{ product.product_name }}</td>
                    <td class="py-2 text-right tabular-nums">{{ formatNumber(product.quantity) }}</td>
                    <td class="py-2 text-right tabular-nums">{{ formatCurrency(product.revenue) }}</td>
                    <td v-if="canSeeProfit" class="py-2 text-right text-success tabular-nums">{{ formatCurrency(product.gross_profit ?? 0) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UCard>

          <div class="space-y-6">
            <UCard v-if="report.by_warehouse.length">
              <template #header>
                <h2 class="font-semibold text-highlighted">{{ translate("features.reports.sales.warehouses.title") }}</h2>
              </template>
              <ul class="space-y-3">
                <li v-for="row in report.by_warehouse" :key="row.warehouse_id" class="space-y-1">
                  <div class="flex justify-between gap-2 text-sm">
                    <span class="text-highlighted">{{ row.warehouse_name }}</span>
                    <span class="font-medium tabular-nums">{{ formatCurrency(row.revenue) }}</span>
                  </div>
                  <div class="h-1.5 overflow-hidden rounded-full bg-elevated">
                    <div class="h-full rounded-full bg-primary" :style="{ width: `${(row.revenue / maxWarehouseRevenue) * 100}%` }" />
                  </div>
                  <p class="text-xs text-muted">{{ translate("features.reports.sales.warehouses.orders", { count: row.orders }) }}</p>
                </li>
              </ul>
            </UCard>

            <UCard>
              <template #header>
                <h2 class="font-semibold text-highlighted">{{ translate("features.reports.sales.refunds.title") }}</h2>
              </template>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between gap-2">
                  <dt class="text-muted">{{ translate("features.reports.sales.refunds.pending") }}</dt>
                  <dd :class="report.refunds.pending ? 'font-medium text-warning' : 'text-toned'">
                    {{ translate("features.reports.sales.refunds.summary", { count: report.refunds.pending, amount: formatCurrency(report.refunds.pending_amount) }) }}
                  </dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-muted">{{ translate("features.reports.sales.refunds.refunded") }}</dt>
                  <dd class="text-toned">{{ translate("features.reports.sales.refunds.summary", { count: report.refunds.refunded, amount: formatCurrency(report.refunds.refunded_amount) }) }}</dd>
                </div>
              </dl>
            </UCard>

            <UCard v-if="statusRows.length">
              <template #header>
                <h2 class="font-semibold text-highlighted">{{ translate("features.reports.sales.statuses.title") }}</h2>
              </template>
              <ul class="space-y-1.5 text-sm">
                <li v-for="row in statusRows" :key="row.status" class="flex justify-between gap-2">
                  <span class="text-toned">{{ row.label }}</span>
                  <span class="font-medium tabular-nums text-highlighted">{{ formatNumber(row.count) }}</span>
                </li>
              </ul>
            </UCard>
          </div>
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>
