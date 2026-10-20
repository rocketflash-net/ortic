<script setup lang="ts">
import { useOverlay } from "@nuxt/ui/composables"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed, ref, watch } from "vue"

import { productQueryKeys } from "@/features/products/services/api"
import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { useUnsavedChangesGuard } from "@/shared/composables/useUnsavedChangesGuard"
import { getApiErrorMessage, getApiFieldErrors } from "@/shared/helpers/error"
import { formatCurrency, formatNumber } from "@/shared/helpers/number"

import PricingPreviewModal from "../components/PricingPreviewModal.vue"
import type { StoreSettings } from "../models"
import { getSettings, previewPricing, settingsQueryKeys, updateSettings } from "../services/api"

/**
 * Store settings (Owner): pricing, fees, contact details, and order notification emails. Changing the markup or
 * rounding first shows which variant prices will be recalculated.
 */
const queryClient = useQueryClient()
const { showToast } = useAppToast()
const overlay = useOverlay()
const previewModal = overlay.create(PricingPreviewModal)

const settingsQuery = useQuery({ queryKey: settingsQueryKeys.store, queryFn: getSettings, select: (response) => response.data! })

const form = ref<StoreSettings | null>(null)
const saved = ref<StoreSettings | null>(null)
const fieldErrors = ref<Record<string, string>>({})

const load = (values: StoreSettings) => {
  // Query data is a reactive proxy, which structuredClone cannot copy; settings are plain JSON.
  form.value = JSON.parse(JSON.stringify(values)) as StoreSettings
  saved.value = JSON.parse(JSON.stringify(values)) as StoreSettings
  fieldErrors.value = {}
}
watch(() => settingsQuery.data.value?.values, (values) => values && load(values), { immediate: true })

const changes = computed<Partial<StoreSettings>>(() => {
  if (!form.value || !saved.value) return {}
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(form.value) as (keyof StoreSettings)[]) {
    if (JSON.stringify(form.value[key]) !== JSON.stringify(saved.value[key])) result[key] = form.value[key]
  }
  return result as Partial<StoreSettings>
})
const isDirty = computed(() => Object.keys(changes.value).length > 0)
useUnsavedChangesGuard(isDirty)

const { mutate: save, isPending: isSaving } = useMutation({
  mutationFn: () => updateSettings(changes.value),
  onSuccess: (response) => {
    queryClient.setQueryData(settingsQueryKeys.store, response)
    load(response.data!.values)
    const repriced = response.data!.repriced_variants ?? 0
    if (repriced) queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
    showToast.success({ title: repriced ? translate("features.settings.store.saved_repriced", { count: repriced }) : translate("features.settings.store.saved") })
  },
  onError: (error) => {
    const errors = getApiFieldErrors(error)
    fieldErrors.value = Object.fromEntries(errors.map((item) => [item.field, item.message]))
    showToast.error({
      title: translate("features.settings.store.save_error"),
      description: errors.length ? translate("features.settings.store.fix_fields") : getApiErrorMessage(error, translate("utils.common.load_error")),
    })
  },
})

const submit = async () => {
  const { markup_percent, price_rounding } = changes.value
  if (markup_percent !== undefined || price_rounding !== undefined) {
    const confirmed = await previewModal.open({
      load: async () => (await previewPricing({ markup_percent, price_rounding })).data!,
    })
    if (!confirmed) return
  }
  save()
}

const server = computed(() => settingsQuery.data.value?.server)
const serverRows = computed(() => {
  const info = server.value
  if (!info) return []
  const mode = (mock: boolean) => (mock ? translate("features.settings.store.server.mock") : translate("features.settings.store.server.live"))
  return [
    {
      label: translate("features.settings.store.server.auto_accept"),
      value: info.auto_accept_orders ? translate("features.settings.store.server.auto_accept_on") : translate("features.settings.store.server.auto_accept_off"),
    },
    { label: translate("features.settings.store.server.payment"), value: info.payment_provider },
    {
      label: translate("features.settings.store.server.mdr"),
      value: translate("features.settings.store.server.mdr_value", { rate: formatNumber(info.qris_mdr_rate * 100, "id-ID", 2), free: formatCurrency(info.qris_mdr_free_max) }),
    },
    { label: translate("features.settings.store.server.mock_rates"), value: mode(info.biteship_mock_rates), warn: info.biteship_mock_rates },
    { label: translate("features.settings.store.server.mock_orders"), value: mode(info.biteship_mock_orders), warn: info.biteship_mock_orders },
    {
      label: translate("features.settings.store.server.webhook"),
      value: info.biteship_webhook_configured ? translate("features.settings.store.server.configured") : translate("features.settings.store.server.not_configured"),
      warn: !info.biteship_webhook_configured,
    },
    {
      label: translate("features.settings.store.server.environment"),
      value: info.is_production ? translate("features.settings.store.server.production") : translate("features.settings.store.server.development"),
    },
  ]
})

const rupiah = { style: "currency", currency: "IDR", maximumFractionDigits: 0 } as const
</script>

<template>
  <UDashboardPanel id="store-settings">
    <template #header>
      <UDashboardNavbar :title="translate('features.settings.store.page_title')" />
    </template>

    <template #body>
      <QueryErrorAlert
        v-if="settingsQuery.isError.value"
        :title="translate('features.settings.store.load_error')"
        :error="settingsQuery.error.value"
        @retry="settingsQuery.refetch()"
      />

      <div v-else-if="!form" class="flex justify-center py-16">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
      </div>

      <form v-else id="store-settings-form" class="grid shrink-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]" @submit.prevent="isDirty && submit()">
        <div class="min-w-0 space-y-6">
          <UCard :ui="{ body: 'grid gap-x-4 gap-y-3 sm:grid-cols-2' }">
            <template #header>
              <h2 class="font-semibold text-highlighted">{{ translate("features.settings.store.pricing.title") }}</h2>
              <p class="text-sm text-muted">{{ translate("features.settings.store.pricing.description") }}</p>
            </template>
            <UFormField :label="translate('features.settings.store.pricing.markup')" :description="translate('features.settings.store.pricing.markup_help')" :error="fieldErrors.markup_percent">
              <UInputNumber v-model="form.markup_percent" :min="0" :max="1000" :step="0.5" :format-options="{ maximumFractionDigits: 2 }" class="w-full" />
            </UFormField>
            <UFormField :label="translate('features.settings.store.pricing.rounding')" :description="translate('features.settings.store.pricing.rounding_help')" :error="fieldErrors.price_rounding">
              <UInputNumber v-model="form.price_rounding" :min="1" :max="100000" :step="100" class="w-full" />
            </UFormField>
          </UCard>

          <UCard :ui="{ body: 'grid gap-x-4 gap-y-3 sm:grid-cols-2' }">
            <template #header>
              <h2 class="font-semibold text-highlighted">{{ translate("features.settings.store.fees.title") }}</h2>
            </template>
            <UFormField :label="translate('features.settings.store.fees.service_fee')" :description="translate('features.settings.store.fees.service_fee_help')" :error="fieldErrors.service_fee">
              <UInputNumber v-model="form.service_fee" :min="0" :step="500" :format-options="rupiah" locale="id-ID" class="w-full" />
            </UFormField>
            <UFormField :label="translate('features.settings.store.fees.packaging')" :description="translate('features.settings.store.fees.packaging_help')" :error="fieldErrors.packaging_weight_gram">
              <UInputNumber v-model="form.packaging_weight_gram" :min="0" :max="20000" :step="10" class="w-full" />
            </UFormField>
            <UFormField :label="translate('features.settings.store.fees.insurance')" :description="translate('features.settings.store.fees.insurance_help')" :error="fieldErrors.insurance_required_above">
              <UInputNumber v-model="form.insurance_required_above" :min="0" :step="100000" :format-options="rupiah" locale="id-ID" class="w-full" />
            </UFormField>
            <UFormField :label="translate('features.settings.store.fees.low_balance')" :error="fieldErrors.biteship_low_balance">
              <UInputNumber v-model="form.biteship_low_balance" :min="0" :step="50000" :format-options="rupiah" locale="id-ID" class="w-full" />
            </UFormField>
          </UCard>

          <UCard :ui="{ body: 'grid gap-x-4 gap-y-3 sm:grid-cols-2' }">
            <template #header>
              <h2 class="font-semibold text-highlighted">{{ translate("features.settings.store.contact.title") }}</h2>
              <p class="text-sm text-muted">{{ translate("features.settings.store.contact.description") }}</p>
            </template>
            <UFormField :label="translate('features.settings.store.contact.name')" :error="fieldErrors.store_name" required>
              <UInput v-model="form.store_name" maxlength="100" class="w-full" />
            </UFormField>
            <UFormField :label="translate('features.settings.store.contact.whatsapp')" :description="translate('features.settings.store.contact.whatsapp_help')" :error="fieldErrors.store_whatsapp">
              <UInput v-model="form.store_whatsapp" inputmode="tel" placeholder="08xxxxxxxxxx" class="w-full" />
            </UFormField>
            <UFormField :label="translate('features.settings.store.contact.email')" :error="fieldErrors.store_email">
              <UInput v-model="form.store_email" type="email" maxlength="191" class="w-full" />
            </UFormField>
            <UFormField :label="translate('features.settings.store.contact.instagram')" :description="translate('features.settings.store.contact.instagram_help')" :error="fieldErrors.store_instagram">
              <UInput v-model="form.store_instagram" maxlength="60" class="w-full">
                <template #leading><span class="text-muted">@</span></template>
              </UInput>
            </UFormField>
            <UFormField :label="translate('features.settings.store.contact.address')" :error="fieldErrors.store_address" class="sm:col-span-2">
              <UTextarea v-model="form.store_address" :rows="2" maxlength="500" class="w-full" />
            </UFormField>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="font-semibold text-highlighted">{{ translate("features.settings.store.notifications.title") }}</h2>
              <p class="text-sm text-muted">{{ translate("features.settings.store.notifications.description") }}</p>
            </template>
            <UFormField :error="Object.entries(fieldErrors).find(([key]) => key.startsWith('order_notification_emails'))?.[1]">
              <UInputTags v-model="form.order_notification_emails" :max="10" :placeholder="translate('features.settings.store.notifications.placeholder')" class="w-full" />
            </UFormField>
          </UCard>
        </div>

        <UCard class="xl:sticky xl:top-0">
          <template #header>
            <h2 class="font-semibold text-highlighted">{{ translate("features.settings.store.server.title") }}</h2>
            <p class="text-sm text-muted">{{ translate("features.settings.store.server.description") }}</p>
          </template>
          <dl class="space-y-3 text-sm">
            <div v-for="row in serverRows" :key="row.label">
              <dt class="text-muted">{{ row.label }}</dt>
              <dd class="font-medium" :class="row.warn ? 'text-warning' : 'text-highlighted'">{{ row.value }}</dd>
            </div>
          </dl>
        </UCard>
      </form>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-3 border-t border-default px-4 py-3 sm:px-6">
        <p v-if="isDirty" class="text-sm text-muted">{{ translate("utils.common.unsaved_hint") }}</p>
        <UButton type="submit" form="store-settings-form" :label="translate('utils.common.save')" icon="i-lucide-save" size="lg" :loading="isSaving" :disabled="!isDirty" />
      </div>
    </template>
  </UDashboardPanel>
</template>
