<script setup lang="ts">
import { useOverlay } from "@nuxt/ui/composables"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { useNow } from "@vueuse/core"
import { useQRCode } from "@vueuse/integrations/useQRCode"
import { computed, watch } from "vue"

import { CatalogPageName } from "@/features/catalog/models"
import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import ConfirmModal from "@/shared/components/ConfirmModal.vue"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { useDateFormatter } from "@/shared/composables/useDateFormatter"
import { getApiErrorCode, getApiErrorMessage } from "@/shared/helpers/error"
import { formatCurrency, formatNumber } from "@/shared/helpers/number"
import NotFoundView from "@/shared/views/NotFoundView.vue"

import OrderStatusBadge from "../components/OrderStatusBadge.vue"
import { OrdersPageName } from "../models"
import { cancelOrder, getOrder, orderQueryKeys, simulatePayment } from "../services/api"

/**
 * Order page. While unpaid it is the payment page: QRIS code, countdown, and a 3-second poll (the API also asks the
 * QRIS provider), switching to a success state as soon as the payment lands. Then it shows the order details.
 */
const props = defineProps<{ code: string }>()

const queryClient = useQueryClient()
const { showToast } = useAppToast()
const { formatDateTime } = useDateFormatter()
const confirmModal = useOverlay().create(ConfirmModal)
const now = useNow({ interval: 1000 })

const orderQuery = useQuery({
  queryKey: computed(() => orderQueryKeys.detail(props.code)),
  queryFn: () => getOrder(props.code),
  select: (response) => response.data!,
  // Poll only while waiting for the payment.
  refetchInterval: (query) => (query.state.data?.data?.status === "awaiting_payment" ? 3000 : false),
  refetchIntervalInBackground: false,
  retry: (count, error) => getApiErrorCode(error) !== "44" && count < 2,
})
const order = computed(() => orderQuery.data.value)
const isNotFound = computed(() => getApiErrorCode(orderQuery.error.value) === "44")

const isAwaitingPayment = computed(() => order.value?.status === "awaiting_payment")
const secondsLeft = computed(() => (order.value ? Math.max(0, Math.floor((new Date(order.value.payment.expires_at).getTime() - now.value.getTime()) / 1000)) : 0))
const isExpired = computed(() => isAwaitingPayment.value && secondsLeft.value === 0)
const countdown = computed(() => `${String(Math.floor(secondsLeft.value / 60)).padStart(2, "0")}:${String(secondsLeft.value % 60).padStart(2, "0")}`)

const qrText = computed(() => order.value?.payment.qr_string ?? "")
const qrImage = useQRCode(qrText, { width: 640, margin: 2, errorCorrectionLevel: "M" })

// Refresh "my orders" once the status moves on.
watch(
  () => order.value?.status,
  (status, previous) => {
    if (previous && status !== previous) queryClient.invalidateQueries({ queryKey: orderQueryKeys.all })
  },
)

const isPaidState = computed(() => ["processing", "awaiting_confirmation", "paid", "awaiting_pickup", "shipped", "completed"].includes(order.value?.status ?? ""))

const { mutate: cancel, isPending: isCancelling } = useMutation({
  mutationFn: () => cancelOrder(props.code),
  onSuccess: (response) => {
    queryClient.setQueryData(orderQueryKeys.detail(props.code), response)
    queryClient.invalidateQueries({ queryKey: orderQueryKeys.all })
    showToast.success({ title: translate("features.orders.detail.cancelled_toast") })
  },
  onError: (error) => showToast.error({ title: translate("features.orders.detail.cancel"), description: getApiErrorMessage(error) }),
})

const askCancel = async () => {
  const confirmed = await confirmModal.open({
    title: translate("features.orders.detail.cancel_confirm_title"),
    description: translate("features.orders.detail.cancel_confirm_description"),
    confirmLabel: translate("features.orders.detail.cancel"),
  })
  if (confirmed === true) cancel()
}

const { mutate: simulate, isPending: isSimulating } = useMutation({
  mutationFn: () => simulatePayment(props.code),
  onSuccess: (response) => queryClient.setQueryData(orderQueryKeys.detail(props.code), response),
  onError: (error) => showToast.error({ title: translate("features.orders.detail.simulate"), description: getApiErrorMessage(error) }),
})
</script>

<template>
  <NotFoundView v-if="isNotFound" />

  <section v-else class="mx-auto max-w-3xl px-4 py-8">
    <RouterLink :to="{ name: OrdersPageName.ORDERS }" class="inline-flex items-center gap-1 text-sm text-muted hover:text-ortic-blue">
      <UIcon name="i-lucide-arrow-left" class="size-4" />{{ translate("features.orders.detail.back") }}
    </RouterLink>

    <QueryErrorAlert v-if="orderQuery.isError.value" class="mt-4" :title="translate('features.orders.load_error')" :error="orderQuery.error.value" @retry="orderQuery.refetch()" />

    <div v-else-if="!order" class="mt-4 space-y-4">
      <USkeleton class="h-10 w-2/3" />
      <USkeleton class="mx-auto aspect-square w-72 rounded-xl" />
    </div>

    <template v-else>
      <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
        <h1 class="font-display text-3xl tracking-wide text-ortic-ink sm:text-4xl">{{ translate("features.orders.detail.title", { code: order.code }) }}</h1>
        <OrderStatusBadge :status="order.status" />
      </div>
      <p class="text-sm text-muted">{{ translate("features.orders.detail.created_at", { date: formatDateTime(order.created_at) }) }}</p>

      <!-- Payment -->
      <div v-if="isAwaitingPayment" class="mt-6 rounded-xl border-2 border-ortic-ink bg-white p-5 text-center shadow-comic">
        <template v-if="!isExpired">
          <h2 class="font-display text-3xl tracking-wide text-ortic-ink">{{ translate("features.orders.detail.pay_title") }}</h2>
          <p class="mx-auto mt-1 max-w-md text-sm text-muted">{{ translate("features.orders.detail.pay_steps") }}</p>
          <p class="mt-4 text-sm text-muted">{{ translate("features.orders.detail.total") }}</p>
          <p class="text-3xl font-bold text-ortic-ink">{{ formatCurrency(order.total) }}</p>

          <div class="mx-auto mt-4 w-full max-w-72 rounded-xl border-2 border-ortic-ink bg-white p-2">
            <img v-if="qrImage" :src="qrImage" :alt="`QRIS ${order.code}`" class="aspect-square w-full" />
          </div>
          <p class="mt-1 text-xs font-semibold tracking-widest text-ortic-ink">QRIS</p>

          <p class="mt-4 inline-flex items-center gap-2 rounded-full bg-ortic-yellow px-4 py-1.5 font-semibold text-ortic-ink tabular-nums">
            <UIcon name="i-lucide-timer" class="size-4" />{{ translate("features.orders.detail.expires_in", { time: countdown }) }}
          </p>
          <p class="mt-3 flex items-center justify-center gap-2 text-sm text-muted">
            <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />{{ translate("features.orders.detail.waiting") }}
          </p>

          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <UButton v-if="qrImage" :to="qrImage" :download="`QRIS-${order.code}.png`" :label="translate('features.orders.detail.download')" icon="i-lucide-download" color="neutral" variant="outline" />
            <UButton :label="translate('features.orders.detail.cancel')" color="error" variant="ghost" :loading="isCancelling" @click="askCancel" />
          </div>
          <UButton
            v-if="order.payment.provider === 'mock'"
            :label="translate('features.orders.detail.simulate')"
            icon="i-lucide-flask-conical"
            color="warning"
            variant="soft"
            size="sm"
            class="mt-3"
            :loading="isSimulating"
            @click="simulate()"
          />
        </template>
        <template v-else>
          <UIcon name="i-lucide-timer-off" class="size-10 text-zinc-400" />
          <p class="mt-2 font-semibold text-ortic-ink">{{ translate("features.orders.detail.expired") }}</p>
          <p class="text-sm text-muted">{{ translate("features.orders.detail.expired_hint") }}</p>
          <UButton :to="{ name: CatalogPageName.PRODUCTS }" :label="translate('features.orders.detail.shop_again')" color="secondary" class="btn-comic mt-4 text-ortic-ink" />
        </template>
      </div>

      <div v-else-if="isPaidState" class="mt-6 rounded-xl border-2 border-ortic-ink bg-ortic-blue bg-halftone-light p-5 text-white shadow-comic">
        <div class="flex items-center gap-3">
          <span class="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-ortic-ink bg-ortic-yellow text-ortic-ink">
            <UIcon name="i-lucide-check" class="size-7" />
          </span>
          <div>
            <p class="font-display text-3xl tracking-wide">{{ translate("features.orders.detail.paid_title") }}</p>
            <p class="text-sm text-white/85">
              {{ order.status === "awaiting_confirmation" ? translate("features.orders.detail.confirmation_description") : translate("features.orders.detail.paid_description") }}
            </p>
          </div>
        </div>
        <p v-if="order.payment.paid_at" class="mt-3 text-xs text-white/70">{{ translate("features.orders.detail.paid_at", { date: formatDateTime(order.payment.paid_at) }) }}</p>
      </div>

      <UAlert
        v-else-if="order.status === 'needs_action'"
        class="mt-6"
        color="warning"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :description="translate('features.orders.detail.needs_action_description')"
      />

      <UAlert
        v-else-if="order.status === 'cancelled'"
        class="mt-6"
        color="neutral"
        variant="subtle"
        icon="i-lucide-circle-x"
        :title="translate('features.orders.detail.cancelled_title')"
        :description="order.cancel_reason ?? undefined"
      />

      <!-- Details -->
      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <div class="rounded-xl border-2 border-ortic-ink bg-white p-4 text-sm">
          <p class="font-semibold text-ortic-ink">{{ translate("features.orders.detail.shipping_to") }}</p>
          <p class="mt-1 text-toned">{{ order.recipient.name }} · {{ order.recipient.phone }}</p>
          <p class="text-toned">{{ order.recipient.address }}, {{ order.recipient.district }}, {{ order.recipient.city }}, {{ order.recipient.province }} {{ order.recipient.postal_code }}</p>
          <p v-if="order.recipient.notes" class="text-muted">{{ order.recipient.notes }}</p>
        </div>
        <div class="rounded-xl border-2 border-ortic-ink bg-white p-4 text-sm">
          <p class="font-semibold text-ortic-ink">{{ translate("features.orders.detail.courier") }}</p>
          <p class="mt-1 text-toned">{{ order.courier.name }} {{ order.courier.service_name }}</p>
          <p class="text-muted">{{ formatNumber(order.weight_gram / 1000, "id-ID", 2) }} kg</p>
        </div>
      </div>

      <div class="mt-4 rounded-xl border-2 border-ortic-ink bg-white p-4">
        <p class="font-semibold text-ortic-ink">{{ translate("features.orders.detail.items") }}</p>
        <ul class="mt-2 divide-y divide-ortic-ink/10">
          <li v-for="item in order.items" :key="item.sku" class="flex items-center gap-3 py-2.5">
            <RouterLink :to="{ name: CatalogPageName.PRODUCT, params: { slug: item.product_slug } }" class="size-12 shrink-0 overflow-hidden rounded-lg border-2 border-ortic-ink/15 bg-ortic-50">
              <img v-if="item.image_url" :src="item.image_url" :alt="item.product_name" class="size-full object-contain p-1" />
            </RouterLink>
            <div class="min-w-0 flex-1 text-sm">
              <p class="line-clamp-1 font-semibold text-ortic-ink">{{ item.product_name }}</p>
              <p class="text-muted">{{ [item.variant_name, `${item.quantity} × ${formatCurrency(item.price)}`].filter(Boolean).join(" · ") }}</p>
            </div>
            <p class="shrink-0 text-sm font-semibold text-ortic-ink">{{ formatCurrency(item.subtotal) }}</p>
          </li>
        </ul>
        <dl class="mt-2 space-y-1 border-t-2 border-ortic-ink/10 pt-3 text-sm">
          <div class="flex justify-between"><dt class="text-muted">{{ translate("features.orders.detail.items_total") }}</dt><dd>{{ formatCurrency(order.items_total) }}</dd></div>
          <div class="flex justify-between"><dt class="text-muted">{{ translate("features.orders.detail.shipping") }}</dt><dd>{{ formatCurrency(order.shipping_fee) }}</dd></div>
          <div v-if="order.insurance_fee" class="flex justify-between"><dt class="text-muted">{{ translate("features.orders.detail.insurance") }}</dt><dd>{{ formatCurrency(order.insurance_fee) }}</dd></div>
          <div class="flex justify-between"><dt class="text-muted">{{ translate("features.orders.detail.service") }}</dt><dd>{{ formatCurrency(order.service_fee) }}</dd></div>
          <div class="flex justify-between pt-1 text-base font-bold text-ortic-ink"><dt>{{ translate("features.orders.detail.total") }}</dt><dd>{{ formatCurrency(order.total) }}</dd></div>
        </dl>
      </div>
    </template>
  </section>
</template>
