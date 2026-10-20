<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { computed } from "vue"

import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { getApiErrorMessage } from "@/shared/helpers/error"

import type { Courier, CourierPayload } from "../models"
import { getCouriers, settingsQueryKeys, updateCourier } from "../services/api"

/**
 * Couriers offered at checkout (Owner). Each change saves right away. The Biteship Starter plan allows a limited
 * number of active couriers; services can be narrowed down (e.g. hide cargo services).
 */
const queryClient = useQueryClient()
const { showToast } = useAppToast()

const couriersQuery = useQuery({ queryKey: settingsQueryKeys.couriers, queryFn: getCouriers, select: (response) => response.data! })

const couriers = computed(() => couriersQuery.data.value?.items ?? [])
const maxActive = computed(() => couriersQuery.data.value?.max_active ?? 3)
const activeCount = computed(() => couriers.value.filter((courier) => courier.is_active).length)

const { mutate, isPending, variables } = useMutation({
  mutationFn: ({ courier, payload }: { courier: Courier; payload: CourierPayload }) => updateCourier(courier.id, payload),
  onSuccess: (response) => {
    queryClient.invalidateQueries({ queryKey: settingsQueryKeys.couriers })
    showToast.success({ title: translate("features.settings.couriers.saved", { name: response.data!.name }) })
  },
  onError: (error) => {
    queryClient.invalidateQueries({ queryKey: settingsQueryKeys.couriers })
    showToast.error({ title: translate("features.settings.couriers.error"), description: getApiErrorMessage(error, translate("utils.common.load_error")) })
  },
})

const isSaving = (courier: Courier) => isPending.value && variables.value?.courier.id === courier.id

const setActive = (courier: Courier, active: boolean) => mutate({ courier, payload: { is_active: active } })

const setAllServices = (courier: Courier, all: boolean) =>
  mutate({ courier, payload: { services: all ? null : courier.available_services.map((service) => service.code) } })

const toggleService = (courier: Courier, code: string, checked: boolean) => {
  const current = courier.services ?? courier.available_services.map((service) => service.code)
  const next = checked ? [...new Set([...current, code])] : current.filter((item) => item !== code)
  if (next.length === 0) {
    showToast.error({ title: translate("features.settings.couriers.choose_one") })
    return
  }
  mutate({ courier, payload: { services: next } })
}

const setSortOrder = (courier: Courier, value: number | null | undefined) => {
  if (value === null || value === undefined || value === courier.sort_order) return
  mutate({ courier, payload: { sort_order: value } })
}
</script>

<template>
  <UDashboardPanel id="couriers">
    <template #header>
      <UDashboardNavbar :title="translate('features.settings.couriers.page_title')" />
    </template>

    <template #body>
      <UAlert color="neutral" variant="subtle" icon="i-lucide-info" :description="translate('features.settings.couriers.description', { max: maxActive })" class="shrink-0" />

      <QueryErrorAlert
        v-if="couriersQuery.isError.value"
        :title="translate('features.settings.couriers.load_error')"
        :error="couriersQuery.error.value"
        @retry="couriersQuery.refetch()"
      />

      <div v-else-if="couriersQuery.isPending.value" class="flex justify-center py-16">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
      </div>

      <div v-else class="grid shrink-0 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <UCard v-for="courier in couriers" :key="courier.id" :class="{ 'opacity-75': !courier.is_active }" :ui="{ body: 'space-y-4' }">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-truck" class="size-5 text-primary" />
                <h2 class="font-semibold text-highlighted">{{ courier.name }}</h2>
                <UBadge :label="courier.code" color="neutral" variant="outline" size="sm" />
              </div>
              <UTooltip :text="!courier.is_active && activeCount >= maxActive ? translate('features.settings.couriers.max_reached', { max: maxActive }) : ''" :disabled="courier.is_active || activeCount < maxActive">
                <USwitch
                  :model-value="courier.is_active"
                  :label="translate('features.settings.couriers.active')"
                  :loading="isSaving(courier)"
                  :disabled="!courier.is_active && activeCount >= maxActive"
                  @update:model-value="setActive(courier, $event)"
                />
              </UTooltip>
            </div>
          </template>

          <div class="space-y-2">
            <p class="text-sm font-medium text-highlighted">{{ translate("features.settings.couriers.services") }}</p>
            <USwitch
              :model-value="courier.services === null"
              :label="translate('features.settings.couriers.all_services')"
              :description="translate('features.settings.couriers.all_services_help')"
              size="sm"
              @update:model-value="setAllServices(courier, $event)"
            />
            <div v-if="courier.services !== null" class="space-y-2 ps-1">
              <UCheckbox
                v-for="service in courier.available_services"
                :key="service.code"
                :model-value="courier.services.includes(service.code)"
                :label="`${service.name} (${service.code})`"
                :description="service.description"
                @update:model-value="toggleService(courier, service.code, $event === true)"
              />
            </div>
          </div>

          <UFormField :label="translate('features.settings.couriers.sort_order')">
            <UInputNumber :model-value="courier.sort_order" :min="0" :max="1000" class="w-32" @update:model-value="setSortOrder(courier, $event)" />
          </UFormField>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
