<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { refDebounced } from "@vueuse/core"
import { computed, reactive, ref } from "vue"

import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import { getApiErrorMessage, getApiFieldErrors } from "@/shared/helpers/error"

import type { Address, ShippingArea } from "../models"
import { checkoutQueryKeys, saveAddress, searchShippingAreas } from "../services/api"

/**
 * Add or edit a shipping address. The district comes from the Biteship area search so shipping can be quoted.
 * Opened through `useOverlay`; closes with the saved address.
 */
const props = defineProps<{ address?: Address }>()
const emit = defineEmits<{ close: [saved?: Address] }>()

const queryClient = useQueryClient()
const { showToast } = useAppToast()

const form = reactive({
  label: props.address?.label ?? "",
  recipient_name: props.address?.recipient_name ?? "",
  phone: props.address?.phone ?? "",
  address: props.address?.address ?? "",
  notes: props.address?.notes ?? "",
  is_default: props.address?.is_default ?? false,
})

const initialArea: ShippingArea | undefined = props.address
  ? {
      id: props.address.biteship_area_id,
      label: `${props.address.district}, ${props.address.city}, ${props.address.province}. ${props.address.postal_code}`,
      province: props.address.province,
      city: props.address.city,
      district: props.address.district,
      postal_code: props.address.postal_code,
    }
  : undefined
const area = ref<ShippingArea | undefined>(initialArea)

// Biteship bills each search: wait for 3+ characters and a pause in typing.
const searchTerm = ref("")
const debounced = refDebounced(searchTerm, 400)
const query = computed(() => debounced.value.trim())
const areasQuery = useQuery({
  queryKey: computed(() => checkoutQueryKeys.areas(query.value)),
  queryFn: () => searchShippingAreas(query.value),
  enabled: computed(() => query.value.length >= 3),
  staleTime: Infinity,
})
const areaItems = computed(() => {
  const found = areasQuery.data.value?.data ?? []
  return area.value && !found.some((item) => item.id === area.value?.id) ? [area.value, ...found] : found
})

const errors = ref<Record<string, string>>({})
const isValid = computed(() => form.recipient_name.trim().length >= 2 && form.phone.trim().length >= 9 && form.address.trim().length >= 10 && area.value !== undefined)

const { mutate, isPending } = useMutation({
  mutationFn: () =>
    saveAddress(
      {
        label: form.label.trim() || null,
        recipient_name: form.recipient_name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        notes: form.notes.trim() || null,
        is_default: form.is_default,
        province: area.value!.province,
        city: area.value!.city,
        district: area.value!.district,
        postal_code: area.value!.postal_code,
        biteship_area_id: area.value!.id,
      },
      props.address?.id,
    ),
  onSuccess: (response) => {
    queryClient.invalidateQueries({ queryKey: checkoutQueryKeys.addresses })
    showToast.success({ title: translate("features.checkout.address.saved") })
    emit("close", response.data!)
  },
  onError: (error) => {
    errors.value = Object.fromEntries(getApiFieldErrors(error).map((item) => [item.field, item.message]))
    showToast.error({ title: translate("features.checkout.address.save_error"), description: getApiErrorMessage(error) })
  },
})
</script>

<template>
  <UModal
    :title="address ? translate('features.checkout.address.form_title_edit') : translate('features.checkout.address.form_title_create')"
    :close="{ onClick: () => emit('close') }"
  >
    <template #body>
      <form id="address-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="isValid && mutate()">
        <UFormField :label="translate('features.checkout.address.recipient')" :error="errors.recipient_name" required>
          <UInput v-model="form.recipient_name" maxlength="100" autocomplete="name" class="w-full" />
        </UFormField>
        <UFormField :label="translate('features.checkout.address.phone')" :error="errors.phone" required>
          <UInput v-model="form.phone" type="tel" inputmode="tel" maxlength="20" autocomplete="tel" :placeholder="translate('features.checkout.address.phone_placeholder')" class="w-full" />
        </UFormField>
        <UFormField :label="translate('features.checkout.address.area')" :error="errors.biteship_area_id" required class="sm:col-span-2">
          <UInputMenu
            v-model="area"
            v-model:search-term="searchTerm"
            :items="areaItems"
            label-key="label"
            by="id"
            :loading="areasQuery.isFetching.value"
            ignore-filter
            icon="i-lucide-map-pin"
            :placeholder="translate('features.checkout.address.area_placeholder')"
            class="w-full"
          >
            <template #empty>
              {{ query.length >= 3 ? translate("features.checkout.address.area_empty") : translate("features.checkout.address.area_min") }}
            </template>
          </UInputMenu>
        </UFormField>
        <UFormField :label="translate('features.checkout.address.detail')" :error="errors.address" required class="sm:col-span-2">
          <UTextarea v-model="form.address" :rows="2" autoresize maxlength="1000" autocomplete="street-address" :placeholder="translate('features.checkout.address.detail_placeholder')" class="w-full" />
        </UFormField>
        <UFormField :label="translate('features.checkout.address.notes')" :error="errors.notes">
          <UInput v-model="form.notes" maxlength="255" :placeholder="translate('features.checkout.address.notes_placeholder')" class="w-full" />
        </UFormField>
        <UFormField :label="translate('features.checkout.address.label')" :error="errors.label">
          <UInput v-model="form.label" maxlength="50" :placeholder="translate('features.checkout.address.label_placeholder')" class="w-full" />
        </UFormField>
        <USwitch v-model="form.is_default" :label="translate('features.checkout.address.make_default')" class="sm:col-span-2" />
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton :label="translate('utils.common.cancel')" color="neutral" variant="ghost" @click="emit('close')" />
        <UButton type="submit" form="address-form" :label="translate('features.checkout.address.save')" :loading="isPending" :disabled="!isValid" />
      </div>
    </template>
  </UModal>
</template>
