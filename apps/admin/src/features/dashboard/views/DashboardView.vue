<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query"
import { VisAxis, VisStackedBar, VisTooltip, VisXYContainer } from "@unovis/vue"
import { StackedBar } from "@unovis/ts"
import { storeToRefs } from "pinia"
import { computed } from "vue"
import type { RouteLocationRaw } from "vue-router"

import { useAuthStore } from "@/features/authentication/stores/authentication.store"
import { OrdersPageName } from "@/features/orders/models"
import { translate, type TranslationKey } from "@/plugins/language"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { formatCurrency, formatNumber } from "@/shared/helpers/number"
import { Permission } from "@/shared/models/access"
import { useAccessStore } from "@/shared/stores/useAccessStore"

import type { DashboardSummary } from "../models"
import { dashboardQueryKeys, getDashboardSummary } from "../services/api"

/**
 * Admin home: today's and last week's sales, a 7-day revenue chart, and cards for work waiting for the team
 * (each links to a pre-filtered order list or the stock page).
 */
const { userData } = storeToRefs(useAuthStore())
const accessStore = useAccessStore()
const firstName = computed(() => userData.value?.name.trim().split(/\s+/)[0])

const summaryQuery = useQuery({
  queryKey: dashboardQueryKeys.all,
  queryFn: getDashboardSummary,
  select: (response) => response.data,
  refetchInterval: 2 * 60 * 1000,
})
const summary = computed(() => summaryQuery.data.value ?? null)

type Kpi = { key: TranslationKey; value: string; icon: string; help?: TranslationKey }
const kpis = computed<Kpi[]>(() => {
  const value = summary.value
  if (!value) return []
  return [
    { key: "features.dashboard.kpi.today_orders", value: formatNumber(value.today.orders), icon: "i-lucide-shopping-bag" },
    { key: "features.dashboard.kpi.today_revenue", value: formatCurrency(value.today.revenue), icon: "i-lucide-wallet" },
    ...(value.today.gross_profit !== null
      ? [{ key: "features.dashboard.kpi.today_profit" as const, value: formatCurrency(value.today.gross_profit), icon: "i-lucide-trending-up", help: "features.dashboard.kpi.profit_help" as const }]
      : []),
    { key: "features.dashboard.kpi.week_orders", value: formatNumber(value.last_7_days.orders), icon: "i-lucide-calendar-days" },
    { key: "features.dashboard.kpi.week_revenue", value: formatCurrency(value.last_7_days.revenue), icon: "i-lucide-banknote" },
    ...(value.last_7_days.gross_profit !== null
      ? [{ key: "features.dashboard.kpi.week_profit" as const, value: formatCurrency(value.last_7_days.gross_profit), icon: "i-lucide-chart-line", help: "features.dashboard.kpi.profit_help" as const }]
      : []),
  ]
})

type Pending = { key: keyof DashboardSummary["pending"] | "low_stock"; count: number; icon: string; color: "warning" | "error" | "info" | "neutral"; to: RouteLocationRaw }
const pendingCards = computed<Pending[]>(() => {
  const value = summary.value
  if (!value) return []
  const orders = (status: string): RouteLocationRaw => ({ name: OrdersPageName.ORDERS, query: { status } })
  const cards: Pending[] = [
    { key: "needs_action", count: value.pending.needs_action, icon: "i-lucide-circle-alert", color: "error", to: orders("needs_action") },
    { key: "awaiting_confirmation", count: value.pending.awaiting_confirmation, icon: "i-lucide-hourglass", color: "warning", to: orders("awaiting_confirmation") },
    { key: "booking_failed", count: value.pending.booking_failed, icon: "i-lucide-truck", color: "error", to: orders("processing") },
    { key: "to_ship", count: value.pending.to_ship, icon: "i-lucide-package", color: "info", to: orders("to_ship") },
    { key: "in_transit", count: value.pending.in_transit, icon: "i-lucide-truck", color: "neutral", to: orders("shipped") },
    { key: "refund_pending", count: value.pending.refund_pending, icon: "i-lucide-banknote", color: "warning", to: { name: OrdersPageName.ORDERS, query: { refund: "pending" } } },
  ]
  if (accessStore.hasPermission(Permission.STOCKS_MANAGE)) {
    cards.push({ key: "low_stock", count: value.low_stock, icon: "i-lucide-package-minus", color: "warning", to: "/stocks?level=low" })
  }
  return cards
})
const hasPending = computed(() => pendingCards.value.some((card) => card.count > 0))

const ICON_CLASS = { warning: "text-warning", error: "text-error", info: "text-info", neutral: "text-muted" } as const

type Day = DashboardSummary["last_7_days"]["daily"][number]
const chartData = computed<Day[]>(() => summary.value?.last_7_days.daily ?? [])
const dayLabel = (date: string) => new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))
const x = (_day: Day, index: number) => index
const y = (day: Day) => day.revenue
const tickFormat = (tick: number | Date) => {
  const day = chartData.value[Number(tick)]
  return day ? dayLabel(day.date) : ""
}
const yTickFormat = (tick: number | Date) => (Number(tick) >= 1_000_000 ? `${formatNumber(Number(tick) / 1_000_000, "id-ID", 1)} jt` : formatNumber(Number(tick) / 1000) + " rb")
const tooltipTriggers = {
  [StackedBar.selectors.bar]: (day: Day) =>
    `<div class="text-sm"><b>${dayLabel(day.date)}</b><br>${formatCurrency(day.revenue)}<br>${translate("features.dashboard.chart.orders", { count: day.orders })}</div>`,
}
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar :title="translate('features.dashboard.page_title')" />
    </template>

    <template #body>
      <section class="relative overflow-hidden rounded-xl bg-ortic-blue p-6 text-white sm:p-8">
        <div class="flex gap-1.5" aria-hidden="true">
          <span class="h-1.5 w-10 rounded-full bg-ortic-red" />
          <span class="h-1.5 w-10 rounded-full bg-ortic-yellow" />
          <span class="h-1.5 w-10 rounded-full bg-white" />
        </div>
        <h1 class="mt-4 font-display text-4xl tracking-wide sm:text-5xl">
          {{ firstName ? translate("features.dashboard.welcome.title_named", { name: firstName }) : translate("features.dashboard.welcome.title") }}
        </h1>
        <p class="mt-2 max-w-xl text-white/85">{{ translate("features.dashboard.welcome.description") }}</p>
      </section>

      <QueryErrorAlert v-if="summaryQuery.isError.value" :title="translate('features.dashboard.load_error')" :error="summaryQuery.error.value" @retry="summaryQuery.refetch()" />

      <div v-else-if="!summary" class="grid gap-4 sm:grid-cols-3">
        <USkeleton v-for="index in 6" :key="index" class="h-24" />
      </div>

      <template v-else>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <UCard v-for="kpi in kpis" :key="kpi.key" :ui="{ body: 'p-4 sm:p-5' }">
            <div class="flex items-start justify-between gap-3" :title="kpi.help ? translate(kpi.help) : undefined">
              <div class="min-w-0">
                <p class="text-sm text-muted">{{ translate(kpi.key) }}</p>
                <p class="mt-1 truncate text-2xl font-semibold text-highlighted tabular-nums">{{ kpi.value }}</p>
              </div>
              <UIcon :name="kpi.icon" class="size-6 shrink-0 text-primary" />
            </div>
          </UCard>
        </div>

        <div class="grid gap-4 lg:grid-cols-5">
          <UCard class="lg:col-span-3">
            <template #header>
              <h2 class="font-semibold text-highlighted">{{ translate("features.dashboard.chart.title") }}</h2>
            </template>
            <VisXYContainer :data="chartData" :height="220" :padding="{ top: 8 }">
              <VisStackedBar :x="x" :y="y" color="var(--ui-primary)" :rounded-corners="4" :bar-padding="0.3" />
              <VisAxis type="x" :tick-format="tickFormat" :num-ticks="chartData.length" :grid-line="false" />
              <VisAxis type="y" :tick-format="yTickFormat" :num-ticks="4" />
              <VisTooltip :triggers="tooltipTriggers" />
            </VisXYContainer>
          </UCard>

          <UCard class="lg:col-span-2">
            <template #header>
              <h2 class="font-semibold text-highlighted">{{ translate("features.dashboard.pending.title") }}</h2>
            </template>
            <p v-if="!hasPending" class="mb-3 text-sm text-muted">{{ translate("features.dashboard.pending.all_clear") }}</p>
            <ul class="divide-y divide-default">
              <li v-for="card in pendingCards" :key="card.key">
                <RouterLink :to="card.to" class="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-elevated">
                  <UIcon :name="card.icon" class="size-5 shrink-0" :class="card.count ? ICON_CLASS[card.color] : 'text-dimmed'" />
                  <span class="flex-1 text-sm" :class="card.count ? 'text-highlighted' : 'text-muted'">{{ translate(`features.dashboard.pending.${card.key}`) }}</span>
                  <UBadge :label="String(card.count)" :color="card.count ? card.color : 'neutral'" :variant="card.count ? 'solid' : 'subtle'" class="tabular-nums" />
                  <UIcon name="i-lucide-chevron-right" class="size-4 text-dimmed" />
                </RouterLink>
              </li>
            </ul>
          </UCard>
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>
