<script setup lang="ts">
import { useMutation, useQuery } from "@tanstack/vue-query"
import { useClipboard } from "@vueuse/core"
import { computed, reactive, ref, watch } from "vue"

import { WarehousesPageName } from "@/features/warehouses/models"
import { getWarehouses, warehouseQueryKeys } from "@/features/warehouses/services/api"
import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import ShippingAreaInput from "@/shared/components/ShippingAreaInput.vue"
import { getApiErrorMessage } from "@/shared/helpers/error"
import { formatCurrency, formatNumber } from "@/shared/helpers/number"
import type { ShippingArea } from "@/shared/models/shipping"

import type { ShippingRate, ShippingRateMeta } from "../models"
import { quoteShippingRates } from "../services/api"

/**
 * Shipping estimate for staff: pick a warehouse, the buyer's district and the package weight, then compare
 * active couriers. The result can be copied as a chat reply.
 *
 * @remarks
 * While the API runs on mock rates (`additionalInfo.is_mock`) a warning says the numbers are not real.
 */
const { showToast } = useAppToast()
const { copy } = useClipboard({ legacy: true })

const warehousesQuery = useQuery({
  queryKey: warehouseQueryKeys.all,
  queryFn: getWarehouses,
  select: (response) => (response.data ?? []).filter((warehouse) => warehouse.is_active),
})
const warehouses = computed(() => warehousesQuery.data.value ?? [])
const readyWarehouses = computed(() => warehouses.value.filter((warehouse) => warehouse.is_shipping_ready))
const warehouseItems = computed(() =>
  warehouses.value.map((warehouse) => ({
    label: warehouse.is_shipping_ready ? warehouse.name : `${warehouse.name} (${translate("features.shippingRates.form.warehouse_not_ready")})`,
    value: warehouse.id,
    disabled: !warehouse.is_shipping_ready,
  })),
)

const form = reactive({
  warehouseId: undefined as number | undefined,
  destination: undefined as ShippingArea | undefined,
  weightGram: 1000 as number | undefined,
  insure: false,
  insuredValue: undefined as number | undefined,
})

// Preselect the first warehouse that can ship.
watch(
  readyWarehouses,
  (ready) => {
    if (form.warehouseId === undefined && ready[0]) form.warehouseId = ready[0].id
  },
  { immediate: true },
)

const toKg = (gram: number) => formatNumber(gram / 1000, "id-ID", 2)

const isValid = computed(
  () => form.warehouseId !== undefined && form.destination !== undefined && (form.weightGram ?? 0) > 0 && (!form.insure || (form.insuredValue ?? 0) > 0),
)

// Snapshot of the request behind the shown result, so editing the form does not relabel old numbers.
const quoted = ref<{ from: string; to: string; weightGram: number } | null>(null)

const { mutate, data: result, error, isPending, isError, reset } = useMutation({
  mutationFn: () =>
    quoteShippingRates({
      warehouse_id: form.warehouseId!,
      destination_area_id: form.destination!.id,
      weight_gram: form.weightGram!,
      insured_value: form.insure ? (form.insuredValue ?? 0) : 0,
    }),
  onMutate: () => {
    quoted.value = {
      from: warehouses.value.find((warehouse) => warehouse.id === form.warehouseId)?.name ?? "",
      to: form.destination!.label,
      weightGram: form.weightGram!,
    }
  },
})

const submit = () => {
  if (!isValid.value) return
  reset()
  mutate()
}

const rates = computed(() => result.value?.data ?? [])
const isMock = computed(() => (result.value?.additionalInfo as ShippingRateMeta | null)?.is_mock === true)

// "2 - 3 days" -> "2–3", "1 days" -> "1"; the lower bound ranks speed.
const durationRange = (rate: ShippingRate) => rate.duration.replace(/\s*days?$/i, "").replace(/\s*-\s*/, "–")
const minDays = (rate: ShippingRate) => Number.parseInt(rate.duration, 10) || Number.POSITIVE_INFINITY

// Short label for the courier tile: "JNE", "J&T", "SCP".
const COURIER_INITIALS: Record<string, string> = { jne: "JNE", jnt: "J&T", sicepat: "SCP" }
const courierInitials = (rate: ShippingRate) => COURIER_INITIALS[rate.courier_code] ?? rate.courier_code.slice(0, 3).toUpperCase()

const cheapestPrice = computed(() => Math.min(...rates.value.map((rate) => rate.price)))
const fastestDays = computed(() => Math.min(...rates.value.map(minDays)))

const copySummary = async () => {
  if (!quoted.value) return
  const lines = rates.value.map(
    (rate) =>
      `• ${rate.courier_name} ${rate.service_name}: ${formatCurrency(rate.price)} (${translate("features.shippingRates.result.days", { range: durationRange(rate) })})`,
  )
  const header = translate("features.shippingRates.result.copy_header", { to: quoted.value.to, kg: toKg(quoted.value.weightGram) })
  await copy([header, ...lines].join("\n"))
  showToast.success({ title: translate("features.shippingRates.result.copied") })
}
</script>

<template>
  <UDashboardPanel id="shipping-rates">
    <template #header>
      <UDashboardNavbar :title="translate('features.shippingRates.page_title')" />
    </template>

    <template #body>
      <UAlert color="neutral" variant="subtle" icon="i-lucide-info" :description="translate('features.shippingRates.description')" class="shrink-0" />

      <QueryErrorAlert
        v-if="warehousesQuery.isError.value"
        :title="translate('features.warehouses.load_error')"
        :error="warehousesQuery.error.value"
        @retry="warehousesQuery.refetch()"
      />

      <div v-else class="grid shrink-0 items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <UCard :ui="{ body: 'space-y-4' }">
          <template #header>
            <h2 class="font-semibold text-highlighted">{{ translate("features.shippingRates.form.title") }}</h2>
          </template>

          <UAlert
            v-if="!warehousesQuery.isPending.value && readyWarehouses.length === 0"
            color="warning"
            variant="subtle"
            icon="i-lucide-triangle-alert"
            :description="translate('features.shippingRates.form.no_ready_warehouse')"
            :actions="[{ label: translate('features.shippingRates.form.open_warehouses'), to: { name: WarehousesPageName.WAREHOUSES }, color: 'warning', variant: 'outline' }]"
          />

          <form id="shipping-rate-form" class="space-y-4" @submit.prevent="submit">
            <UFormField :label="translate('features.shippingRates.form.warehouse')" required>
              <USelect
                v-model="form.warehouseId"
                :items="warehouseItems"
                :loading="warehousesQuery.isPending.value"
                :placeholder="translate('features.shippingRates.form.warehouse_placeholder')"
                icon="i-lucide-warehouse"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="translate('features.shippingRates.form.destination')" :description="translate('features.shippingRates.form.destination_help')" required>
              <ShippingAreaInput v-model="form.destination" />
            </UFormField>

            <UFormField
              :label="translate('features.shippingRates.form.weight')"
              :help="translate('features.shippingRates.form.weight_help', { kg: toKg(form.weightGram ?? 0) })"
              required
            >
              <UInputNumber v-model="form.weightGram" :min="1" :max="500000" :step="100" class="w-full" />
            </UFormField>

            <USwitch v-model="form.insure" :label="translate('features.shippingRates.form.insure')" />

            <UFormField v-if="form.insure" :label="translate('features.shippingRates.form.insured_value')" required>
              <UInputNumber
                v-model="form.insuredValue"
                :min="0"
                :step="10000"
                :format-options="{ style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }"
                locale="id-ID"
                class="w-full"
              />
            </UFormField>
          </form>

          <template #footer>
            <UButton
              type="submit"
              form="shipping-rate-form"
              :label="translate('features.shippingRates.form.submit')"
              icon="i-lucide-search"
              :loading="isPending"
              :disabled="!isValid"
              block
            />
          </template>
        </UCard>

        <div class="space-y-4">
          <UAlert v-if="isError" color="error" variant="subtle" icon="i-lucide-circle-x" :title="translate('features.shippingRates.result.error_title')" :description="getApiErrorMessage(error, translate('utils.common.load_error'))" />

          <template v-else-if="result && quoted">
            <UAlert
              v-if="isMock"
              color="warning"
              variant="subtle"
              icon="i-lucide-flask-conical"
              :title="translate('features.shippingRates.result.mock_title')"
              :description="translate('features.shippingRates.result.mock_description')"
            />

            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="font-medium text-highlighted">
                  {{ translate("features.shippingRates.result.summary", { from: quoted.from, to: quoted.to, kg: toKg(quoted.weightGram) }) }}
                </p>
                <p class="text-sm text-muted">{{ translate("features.shippingRates.result.options", { count: rates.length }) }}</p>
              </div>
              <UButton
                v-if="rates.length"
                :label="translate('features.shippingRates.result.copy')"
                icon="i-lucide-copy"
                color="neutral"
                variant="outline"
                size="sm"
                @click="copySummary"
              />
            </div>

            <UEmpty
              v-if="!rates.length"
              icon="i-lucide-truck"
              :title="translate('features.shippingRates.result.no_courier_title')"
              :description="translate('features.shippingRates.result.no_courier_description')"
            />

            <ul v-else class="divide-y divide-default overflow-hidden rounded-lg border border-default">
              <li v-for="rate in rates" :key="`${rate.courier_code}-${rate.service_code}`" class="flex items-center gap-3 px-4 py-3">
                <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-elevated text-xs font-bold text-highlighted">
                  {{ courierInitials(rate) }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="font-medium text-highlighted">{{ rate.courier_name }} {{ rate.service_name }}</span>
                    <UBadge v-if="rate.price === cheapestPrice" :label="translate('features.shippingRates.result.cheapest')" color="success" variant="subtle" size="sm" />
                    <UBadge v-if="minDays(rate) === fastestDays" :label="translate('features.shippingRates.result.fastest')" color="secondary" variant="subtle" size="sm" />
                  </div>
                  <p class="text-sm text-muted">
                    {{ translate("features.shippingRates.result.days", { range: durationRange(rate) }) }}
                    <template v-if="rate.insurance_fee">
                      · {{ translate("features.shippingRates.result.shipping_fee", { amount: formatCurrency(rate.shipping_fee) }) }}
                      + {{ translate("features.shippingRates.result.insurance_fee", { amount: formatCurrency(rate.insurance_fee) }) }}
                    </template>
                  </p>
                </div>
                <p class="shrink-0 text-right font-semibold text-highlighted tabular-nums">{{ formatCurrency(rate.price) }}</p>
              </li>
            </ul>
          </template>

          <UEmpty
            v-else
            icon="i-lucide-truck"
            :title="translate('features.shippingRates.result.empty_title')"
            :description="translate('features.shippingRates.result.empty_description')"
            variant="outline"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
