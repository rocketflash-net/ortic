<script setup lang="ts">
import { useOverlay } from "@nuxt/ui/composables"
import { ORDER_STATUS_LABELS } from "@ortic/shared"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed } from "vue"

import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { useDateFormatter } from "@/shared/composables/useDateFormatter"
import { getApiErrorMessage } from "@/shared/helpers/error"
import { formatCurrency, formatNumber } from "@/shared/helpers/number"
import type { BackendResponse } from "@/shared/models/api"

import RefundOrderModal from "../components/RefundOrderModal.vue"
import RejectOrderModal from "../components/RejectOrderModal.vue"
import { ORDER_STATUS_COLOR, OrdersPageName, shippingStatusLabel, type AdminOrderDetail, type OrderEvent } from "../models"
import { acceptOrder, bookOrderShipment, getOrder, orderQueryKeys, simulateOrderShipping } from "../services/api"

/**
 * Order detail: items & money, buyer and address, payment, courier booking, full history (including internal notes),
 * and the actions the API allows right now (`can`).
 */
const { code } = defineProps<{ code: string }>()

const queryClient = useQueryClient()
const { showToast } = useAppToast()
const { formatDateTime } = useDateFormatter()
const overlay = useOverlay()
const rejectModal = overlay.create(RejectOrderModal)
const refundModal = overlay.create(RefundOrderModal)

const orderQuery = useQuery({
  queryKey: computed(() => orderQueryKeys.detail(code)),
  queryFn: () => getOrder(code),
  select: (response) => response.data,
})
const order = computed(() => orderQuery.data.value ?? null)

const grossProfit = computed(() => {
  const value = order.value
  if (!value || value.cost_total === null) return null
  return value.items_total - value.cost_total + value.service_fee - value.payment.mdr_amount
})

const applyResult = (response: BackendResponse<AdminOrderDetail>) => {
  queryClient.setQueryData(orderQueryKeys.detail(code), response)
  queryClient.invalidateQueries({ queryKey: orderQueryKeys.all })
  queryClient.invalidateQueries({ queryKey: ["dashboard"] })
}
const onError = (error: unknown) => showToast.error({ title: translate("features.orders.actions.error"), description: getApiErrorMessage(error) })

const acceptMutation = useMutation({
  mutationFn: () => acceptOrder(code),
  onSuccess: (response) => {
    applyResult(response)
    showToast.success({ title: translate("features.orders.actions.accepted") })
  },
  onError,
})

const bookMutation = useMutation({
  mutationFn: () => bookOrderShipment(code),
  onSuccess: (response) => {
    applyResult(response)
    showToast.success({ title: translate("features.orders.actions.booked") })
  },
  onError,
})

const simulateMutation = useMutation({
  mutationFn: () => simulateOrderShipping(code),
  onSuccess: (response) => {
    applyResult(response)
    showToast.info({ title: translate("features.orders.actions.simulated", { status: shippingStatusLabel(response.data?.shipment.status ?? null) }) })
  },
  onError,
})

const eventIcon = (event: OrderEvent) => {
  if (event.type === "note") return "i-lucide-sticky-note"
  if (event.type === "tracking") return "i-lucide-truck"
  return "i-lucide-circle-check"
}

const timeline = computed(() => [...(order.value?.events ?? [])].reverse())
</script>

<template>
  <UDashboardPanel id="order-detail">
    <template #header>
      <UDashboardNavbar :title="code">
        <template #leading>
          <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" :to="{ name: OrdersPageName.ORDERS }" :aria-label="translate('features.orders.detail.back')" />
        </template>
        <template #right>
          <UButton
            v-if="order?.shipment.waybill_id"
            :label="translate('features.orders.actions.print_label')"
            icon="i-lucide-printer"
            color="neutral"
            variant="outline"
            :to="{ name: OrdersPageName.ORDER_LABEL, params: { code } }"
            target="_blank"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <QueryErrorAlert v-if="orderQuery.isError.value" :title="translate('features.orders.load_error')" :error="orderQuery.error.value" @retry="orderQuery.refetch()" />

      <div v-else-if="!order" class="space-y-4">
        <USkeleton class="h-24 w-full" />
        <USkeleton class="h-64 w-full" />
      </div>

      <template v-else>
        <!-- Status & actions; shrink-0 so the scrolling panel body doesn't squash it on narrow/zoomed screens -->
        <UCard class="shrink-0">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <UBadge :label="ORDER_STATUS_LABELS[order.status]" :color="ORDER_STATUS_COLOR[order.status]" variant="subtle" size="lg" />
                <UBadge
                  v-if="order.refund.status !== 'none'"
                  :label="translate(`features.orders.refund_status.${order.refund.status}`)"
                  :color="order.refund.status === 'pending' ? 'warning' : 'neutral'"
                  variant="outline"
                />
              </div>
              <p class="mt-2 text-sm text-muted">{{ translate("features.orders.detail.created_at", { date: formatDateTime(order.created_at) }) }}</p>
              <p v-if="order.reject_reason" class="mt-1 text-sm text-error">{{ translate("features.orders.detail.rejected", { reason: order.reject_reason }) }}</p>
              <p v-else-if="order.cancel_reason" class="mt-1 text-sm text-muted">{{ translate("features.orders.detail.cancelled", { reason: order.cancel_reason }) }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <UButton v-if="order.can.accept" :label="translate('features.orders.actions.accept')" icon="i-lucide-check" :loading="acceptMutation.isPending.value" @click="acceptMutation.mutate()" />
              <UButton
                v-if="order.can.book_shipment"
                :label="translate('features.orders.actions.book')"
                icon="i-lucide-truck"
                :loading="bookMutation.isPending.value"
                @click="bookMutation.mutate()"
              />
              <UButton
                v-if="order.can.mark_refunded"
                :label="translate('features.orders.actions.refund')"
                icon="i-lucide-banknote"
                color="warning"
                @click="refundModal.open({ code, amount: order.refund.amount ?? order.total })"
              />
              <UButton
                v-if="order.can.simulate_shipping"
                :label="translate('features.orders.actions.simulate')"
                icon="i-lucide-step-forward"
                color="info"
                :loading="simulateMutation.isPending.value"
                @click="simulateMutation.mutate()"
              />
              <UButton v-if="order.can.reject" :label="translate('features.orders.actions.reject')" icon="i-lucide-x" color="error" variant="soft" @click="rejectModal.open({ code })" />
            </div>
          </div>

          <p v-if="order.can.simulate_shipping" class="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <UIcon name="i-lucide-flask-conical" class="size-3.5 shrink-0" />
            {{ translate("features.orders.actions.simulate_help") }}
          </p>
          <UAlert
            v-if="order.refund.status === 'pending'"
            class="mt-4"
            color="warning"
            variant="subtle"
            icon="i-lucide-banknote"
            :description="translate('features.orders.detail.refund_pending', { amount: formatCurrency(order.refund.amount ?? order.total) })"
          />
          <UAlert
            v-else-if="order.refund.status === 'refunded'"
            class="mt-4"
            color="neutral"
            variant="subtle"
            icon="i-lucide-banknote"
            :title="translate('features.orders.detail.refund_done', { amount: formatCurrency(order.refund.amount ?? 0), date: order.refund.refunded_at ? formatDateTime(order.refund.refunded_at) : '' })"
            :description="order.refund.note ?? undefined"
          />
        </UCard>

        <div class="grid shrink-0 gap-4 lg:grid-cols-3">
          <div class="space-y-4 lg:col-span-2">
            <!-- Items & totals -->
            <UCard :ui="{ body: 'p-0 sm:p-0' }">
              <template #header>
                <h2 class="font-semibold text-highlighted">{{ translate("features.orders.detail.items") }}</h2>
              </template>
              <ul class="divide-y divide-default">
                <li v-for="item in order.items" :key="item.sku" class="flex items-center gap-3 px-4 py-3 sm:px-6">
                  <div class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-default bg-elevated">
                    <img v-if="item.image_url" :src="item.image_url" :alt="item.product_name" class="size-full object-contain" loading="lazy" />
                    <UIcon v-else name="i-lucide-image" class="size-5 text-dimmed" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-medium text-highlighted">{{ item.product_name }}</p>
                    <p class="truncate text-sm text-muted">
                      {{ [item.variant_name, translate("features.orders.detail.sku", { sku: item.sku })].filter(Boolean).join(" · ") }}
                    </p>
                  </div>
                  <div class="text-right text-sm tabular-nums">
                    <p class="text-muted">{{ item.quantity }} × {{ formatCurrency(item.price) }}</p>
                    <p class="font-medium text-highlighted">{{ formatCurrency(item.subtotal) }}</p>
                  </div>
                </li>
              </ul>
              <dl class="space-y-1.5 border-t border-default px-4 py-4 text-sm sm:px-6">
                <div class="flex justify-between"><dt class="text-muted">{{ translate("features.orders.detail.items_total") }}</dt><dd class="tabular-nums">{{ formatCurrency(order.items_total) }}</dd></div>
                <div class="flex justify-between"><dt class="text-muted">{{ translate("features.orders.detail.shipping_fee") }}</dt><dd class="tabular-nums">{{ formatCurrency(order.shipping_fee) }}</dd></div>
                <div v-if="order.insurance_fee" class="flex justify-between"><dt class="text-muted">{{ translate("features.orders.detail.insurance_fee") }}</dt><dd class="tabular-nums">{{ formatCurrency(order.insurance_fee) }}</dd></div>
                <div class="flex justify-between"><dt class="text-muted">{{ translate("features.orders.detail.service_fee") }}</dt><dd class="tabular-nums">{{ formatCurrency(order.service_fee) }}</dd></div>
                <div class="flex justify-between border-t border-default pt-2 text-base font-semibold text-highlighted">
                  <dt>{{ translate("features.orders.detail.total") }}</dt><dd class="tabular-nums">{{ formatCurrency(order.total) }}</dd>
                </div>
                <div class="flex justify-between text-muted"><dt>{{ translate("features.orders.detail.mdr") }}</dt><dd class="tabular-nums">− {{ formatCurrency(order.payment.mdr_amount) }}</dd></div>
                <template v-if="order.cost_total !== null && grossProfit !== null">
                  <div class="flex justify-between text-muted"><dt>{{ translate("features.orders.detail.cost") }}</dt><dd class="tabular-nums">{{ formatCurrency(order.cost_total) }}</dd></div>
                  <div class="flex justify-between font-medium" :title="translate('features.orders.detail.profit_help')">
                    <dt>{{ translate("features.orders.detail.gross_profit") }}</dt>
                    <dd class="tabular-nums" :class="grossProfit >= 0 ? 'text-success' : 'text-error'">{{ formatCurrency(grossProfit) }}</dd>
                  </div>
                </template>
              </dl>
            </UCard>

            <!-- Shipment -->
            <UCard>
              <template #header>
                <h2 class="font-semibold text-highlighted">{{ translate("features.orders.detail.shipment") }}</h2>
              </template>
              <UAlert
                v-if="order.shipment.error && !order.shipment.biteship_order_id"
                class="mb-4"
                color="error"
                variant="subtle"
                icon="i-lucide-triangle-alert"
                :description="translate('features.orders.detail.booking_error', { attempts: order.shipment.attempts, error: order.shipment.error })"
              />
              <dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt class="text-muted">{{ translate("features.orders.detail.courier") }}</dt>
                  <dd class="text-highlighted">{{ order.courier.name }} {{ order.courier.service_name }}<span v-if="order.courier.duration" class="text-muted"> · {{ order.courier.duration }}</span></dd>
                </div>
                <div>
                  <dt class="text-muted">{{ translate("features.orders.detail.weight") }}</dt>
                  <dd class="text-highlighted tabular-nums">{{ formatNumber(order.weight_gram) }} g<span v-if="order.insured_value" class="text-muted"> · {{ translate("features.orders.detail.insured") }} {{ formatCurrency(order.insured_value) }}</span></dd>
                </div>
                <div>
                  <dt class="text-muted">{{ translate("features.orders.detail.waybill") }}</dt>
                  <dd class="font-medium text-highlighted tabular-nums">{{ order.shipment.waybill_id ?? translate("features.orders.detail.not_booked") }}</dd>
                </div>
                <div>
                  <dt class="text-muted">{{ translate("features.orders.detail.shipping_status") }}</dt>
                  <dd class="text-highlighted">{{ shippingStatusLabel(order.shipment.status) }}</dd>
                </div>
                <div v-if="order.shipment.pickup_scheduled_at">
                  <dt class="text-muted">{{ translate("features.orders.detail.pickup") }}</dt>
                  <dd class="text-highlighted">{{ formatDateTime(order.shipment.pickup_scheduled_at) }}</dd>
                </div>
                <div v-if="order.shipment.booked_at">
                  <dt class="text-muted">{{ translate("features.orders.detail.booked_at") }}</dt>
                  <dd class="text-highlighted">{{ formatDateTime(order.shipment.booked_at) }}</dd>
                </div>
                <div v-if="order.shipment.driver_name">
                  <dt class="text-muted">{{ translate("features.orders.detail.driver") }}</dt>
                  <dd class="text-highlighted">{{ order.shipment.driver_name }}<span v-if="order.shipment.driver_phone" class="text-muted"> · {{ order.shipment.driver_phone }}</span></dd>
                </div>
                <div v-if="order.warehouse">
                  <dt class="text-muted">{{ translate("features.orders.detail.warehouse") }}</dt>
                  <dd class="text-highlighted">{{ order.warehouse.name }} ({{ order.warehouse.code }})</dd>
                </div>
              </dl>
              <UButton
                v-if="order.shipment.courier_link"
                :label="translate('features.orders.detail.track')"
                :to="order.shipment.courier_link"
                target="_blank"
                variant="link"
                trailing-icon="i-lucide-external-link"
                class="mt-3 px-0"
              />
            </UCard>

            <!-- Timeline -->
            <UCard>
              <template #header>
                <h2 class="font-semibold text-highlighted">{{ translate("features.orders.detail.timeline") }}</h2>
              </template>
              <ol class="relative space-y-4 border-s border-default ps-6">
                <li v-for="(event, index) in timeline" :key="index" class="relative">
                  <span
                    class="absolute -start-[2.05rem] flex size-6 items-center justify-center rounded-full ring-4 ring-default"
                    :class="event.type === 'note' ? 'bg-warning/15 text-warning' : index === 0 ? 'bg-primary text-inverted' : 'bg-elevated text-muted'"
                  >
                    <UIcon :name="eventIcon(event)" class="size-3.5" />
                  </span>
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-medium text-highlighted">{{ event.title }}</p>
                    <UBadge v-if="!event.is_public" :label="translate('features.orders.detail.private')" size="sm" color="warning" variant="outline" />
                  </div>
                  <p v-if="event.description" class="text-sm text-toned">{{ event.description }}</p>
                  <p class="text-xs text-muted">
                    {{ formatDateTime(event.occurred_at) }}<span v-if="event.actor_name"> · {{ translate("features.orders.detail.by", { name: event.actor_name }) }}</span>
                  </p>
                </li>
              </ol>
            </UCard>
          </div>

          <div class="space-y-4">
            <UCard>
              <template #header>
                <h2 class="font-semibold text-highlighted">{{ translate("features.orders.detail.buyer") }}</h2>
              </template>
              <p class="font-medium text-highlighted">{{ order.buyer.name }}</p>
              <p class="text-sm text-muted">{{ order.buyer.email }}</p>
              <p v-if="order.buyer.phone" class="text-sm text-muted">{{ order.buyer.phone }}</p>
              <p v-if="order.buyer.profession" class="text-sm text-muted">{{ order.buyer.profession }}</p>
            </UCard>

            <UCard>
              <template #header>
                <h2 class="font-semibold text-highlighted">{{ translate("features.orders.detail.recipient") }}</h2>
              </template>
              <p class="font-medium text-highlighted">{{ order.recipient.name }}</p>
              <p class="text-sm text-muted">{{ order.recipient.phone }}</p>
              <p class="mt-2 text-sm text-toned">{{ order.recipient.address }}</p>
              <p class="text-sm text-toned">
                {{ [order.recipient.district, order.recipient.city, order.recipient.province, order.recipient.postal_code].join(", ") }}
              </p>
              <p v-if="order.recipient.notes" class="mt-2 text-sm text-muted">{{ translate("features.orders.detail.notes", { notes: order.recipient.notes }) }}</p>
            </UCard>

            <UCard>
              <template #header>
                <h2 class="font-semibold text-highlighted">{{ translate("features.orders.detail.payment") }}</h2>
              </template>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between gap-2"><dt class="text-muted">{{ translate("features.orders.detail.provider") }}</dt><dd class="uppercase">{{ order.payment.provider }}</dd></div>
                <div class="flex justify-between gap-2">
                  <dt class="text-muted">{{ translate("features.orders.detail.paid_at") }}</dt>
                  <dd>{{ order.payment.paid_at ? formatDateTime(order.payment.paid_at) : translate("features.orders.detail.unpaid") }}</dd>
                </div>
                <div v-if="!order.payment.paid_at" class="flex justify-between gap-2">
                  <dt class="text-muted">{{ translate("features.orders.detail.expires_at") }}</dt><dd>{{ formatDateTime(order.payment.expires_at) }}</dd>
                </div>
                <div v-if="order.payment.provider_ref" class="flex justify-between gap-2">
                  <dt class="text-muted">{{ translate("features.orders.detail.reference") }}</dt><dd class="truncate font-mono text-xs">{{ order.payment.provider_ref }}</dd>
                </div>
                <div class="flex justify-between gap-2"><dt class="text-muted">MDR</dt><dd class="tabular-nums">{{ formatCurrency(order.payment.mdr_amount) }}</dd></div>
              </dl>
            </UCard>
          </div>
        </div>
      </template>
    </template>
  </UDashboardPanel>
</template>
