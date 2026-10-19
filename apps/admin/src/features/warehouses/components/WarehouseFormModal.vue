<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { computed, reactive } from "vue"

import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import ShippingAreaInput from "@/shared/components/ShippingAreaInput.vue"
import { getApiErrorMessage } from "@/shared/helpers/error"
import type { ShippingArea } from "@/shared/models/shipping"

import type { Warehouse, WarehousePayload } from "../models"
import { createWarehouse, updateWarehouse, warehouseQueryKeys } from "../services/api"

/**
 * Adds or edits a warehouse. Opened through `useOverlay`; pass `warehouse` to edit.
 *
 * @remarks
 * The API validates every field (postal code, HH:mm pickup time, coordinates); empty optional fields are sent as null.
 * Picking a Biteship area fills province, city, district, postal code and the area ID used for shipping quotes.
 */
const props = defineProps<{ warehouse?: Warehouse }>()
const emit = defineEmits<{ close: [saved?: boolean] }>()

const queryClient = useQueryClient()
const { showToast } = useAppToast()

const form = reactive({
  code: props.warehouse?.code ?? "",
  name: props.warehouse?.name ?? "",
  address: props.warehouse?.address ?? "",
  province: props.warehouse?.province ?? "",
  city: props.warehouse?.city ?? "",
  district: props.warehouse?.district ?? "",
  postal_code: props.warehouse?.postal_code ?? "",
  biteship_area_id: props.warehouse?.biteship_area_id ?? "",
  latitude: props.warehouse?.latitude ?? undefined,
  longitude: props.warehouse?.longitude ?? undefined,
  pic_name: props.warehouse?.pic_name ?? "",
  pic_phone: props.warehouse?.pic_phone ?? "",
  pickup_time: props.warehouse?.pickup_time ?? "13:00",
  is_active: props.warehouse?.is_active ?? true,
})

const selectArea = (area: ShippingArea | undefined) => {
  if (!area) return
  Object.assign(form, { province: area.province, city: area.city, district: area.district, postal_code: area.postal_code, biteship_area_id: area.id })
}

const title = computed(() =>
  props.warehouse ? translate("features.warehouses.form.edit_title", { name: props.warehouse.name }) : translate("features.warehouses.form.create_title"),
)

const isValid = computed(() => [form.code, form.name, form.address, form.province, form.city].every((value) => value.trim() !== ""))

const blankToNull = (value: string) => (value.trim() === "" ? null : value.trim())

const toPayload = (): WarehousePayload => ({
  code: form.code.trim(),
  name: form.name.trim(),
  address: form.address.trim(),
  province: form.province.trim(),
  city: form.city.trim(),
  district: blankToNull(form.district),
  postal_code: blankToNull(form.postal_code),
  biteship_area_id: blankToNull(form.biteship_area_id),
  latitude: form.latitude ?? null,
  longitude: form.longitude ?? null,
  pic_name: blankToNull(form.pic_name),
  pic_phone: blankToNull(form.pic_phone),
  pickup_time: form.pickup_time,
  is_active: form.is_active,
})

const { mutate, isPending } = useMutation({
  mutationFn: () => (props.warehouse ? updateWarehouse(props.warehouse.id, toPayload()) : createWarehouse(toPayload())),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.all })
    showToast.success({ title: translate("features.warehouses.form.saved") })
    emit("close", true)
  },
  onError: (error) => {
    showToast.error({
      title: translate("features.warehouses.form.error_title"),
      description: getApiErrorMessage(error, translate("utils.common.load_error")),
    })
  },
})
</script>

<template>
  <UModal :title="title" :close="{ onClick: () => emit('close') }" :ui="{ content: 'sm:max-w-2xl' }">
    <template #body>
      <form id="warehouse-form" class="grid gap-x-4 gap-y-1 sm:grid-cols-2" @submit.prevent="isValid && mutate()">
        <UFormField :label="translate('features.warehouses.form.code')" :description="translate('features.warehouses.form.code_help')" required>
          <UInput v-model="form.code" maxlength="16" class="uppercase" />
        </UFormField>
        <UFormField :label="translate('features.warehouses.form.name')" required>
          <UInput v-model="form.name" maxlength="100" />
        </UFormField>
        <UFormField :label="translate('features.warehouses.form.address')" required class="sm:col-span-2">
          <UTextarea v-model="form.address" :rows="2" maxlength="1000" />
        </UFormField>
        <UFormField
          :label="translate('features.warehouses.form.area_search')"
          :description="form.biteship_area_id ? translate('features.warehouses.form.area_selected', { id: form.biteship_area_id }) : translate('features.warehouses.form.area_help')"
          class="sm:col-span-2"
        >
          <ShippingAreaInput @update:model-value="selectArea" />
        </UFormField>
        <UFormField :label="translate('features.warehouses.form.province')" required>
          <UInput v-model="form.province" />
        </UFormField>
        <UFormField :label="translate('features.warehouses.form.city')" required>
          <UInput v-model="form.city" />
        </UFormField>
        <UFormField :label="translate('features.warehouses.form.district')">
          <UInput v-model="form.district" />
        </UFormField>
        <UFormField :label="translate('features.warehouses.form.postal_code')">
          <UInput v-model="form.postal_code" inputmode="numeric" maxlength="5" />
        </UFormField>
        <UFormField :label="translate('features.warehouses.form.latitude')">
          <UInputNumber v-model="form.latitude" :step="0.0000001" :format-options="{ maximumFractionDigits: 7 }" />
        </UFormField>
        <UFormField :label="translate('features.warehouses.form.longitude')">
          <UInputNumber v-model="form.longitude" :step="0.0000001" :format-options="{ maximumFractionDigits: 7 }" />
        </UFormField>
        <UFormField :label="translate('features.warehouses.form.pic_name')">
          <UInput v-model="form.pic_name" />
        </UFormField>
        <UFormField :label="translate('features.warehouses.form.pic_phone')">
          <UInput v-model="form.pic_phone" inputmode="tel" placeholder="08xxxxxxxxxx" />
        </UFormField>
        <UFormField :label="translate('features.warehouses.form.pickup_time')" required>
          <UInput v-model="form.pickup_time" type="time" />
        </UFormField>
        <UFormField :label="translate('features.warehouses.form.is_active')">
          <USwitch v-model="form.is_active" />
        </UFormField>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton :label="translate('utils.common.cancel')" color="neutral" variant="ghost" @click="emit('close')" />
        <UButton type="submit" form="warehouse-form" :label="translate('utils.common.save')" :loading="isPending" :disabled="!isValid" />
      </div>
    </template>
  </UModal>
</template>
