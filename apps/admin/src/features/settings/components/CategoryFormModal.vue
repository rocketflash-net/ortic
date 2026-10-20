<script setup lang="ts">
import { useOverlay } from "@nuxt/ui/composables"
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { computed, reactive } from "vue"

import { productQueryKeys } from "@/features/products/services/api"
import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import { getApiErrorMessage } from "@/shared/helpers/error"
import { formatNumber } from "@/shared/helpers/number"

import { CATEGORY_COLORS, type AdminCategory, type CategoryColor, type CategoryPayload } from "../models"
import { previewCategoryMarkup, settingsQueryKeys, updateCategory } from "../services/api"
import PricingPreviewModal from "./PricingPreviewModal.vue"

/**
 * Edits a category. The Owner (`canManageMarkup`) also sets the category markup; changing it shows the price
 * preview first, because every unlocked variant of the category is repriced on save.
 */
const props = defineProps<{ category: AdminCategory; canManageMarkup: boolean; globalMarkup?: number }>()
const emit = defineEmits<{ close: [saved?: boolean] }>()

const queryClient = useQueryClient()
const { showToast } = useAppToast()
const previewModal = useOverlay().create(PricingPreviewModal)

const NO_COLOR = "none"
const form = reactive({
  name: props.category.name,
  color: (props.category.color ?? NO_COLOR) as CategoryColor | typeof NO_COLOR,
  sort_order: props.category.sort_order,
  is_active: props.category.is_active,
  markup_percent: props.category.markup_percent ?? undefined,
})

const colorItems = computed(() => [
  { label: translate("features.settings.categories.colors.none"), value: NO_COLOR },
  ...CATEGORY_COLORS.map((color) => ({ label: translate(`features.settings.categories.colors.${color}`), value: color })),
])

const markupValue = computed(() => (form.markup_percent === undefined || form.markup_percent === null ? null : form.markup_percent))
const markupChanged = computed(() => props.canManageMarkup && markupValue.value !== (props.category.markup_percent ?? null))

const payload = (): CategoryPayload => ({
  name: form.name.trim(),
  color: form.color === NO_COLOR ? null : form.color,
  sort_order: form.sort_order,
  is_active: form.is_active,
  ...(props.canManageMarkup ? { markup_percent: markupValue.value } : {}),
})

const { mutate, isPending } = useMutation({
  mutationFn: () => updateCategory(props.category.id, payload()),
  onSuccess: (response) => {
    queryClient.invalidateQueries({ queryKey: settingsQueryKeys.categories })
    queryClient.invalidateQueries({ queryKey: productQueryKeys.categories })
    const repriced = response.data?.repriced_variants ?? 0
    if (repriced) queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
    showToast.success({
      title: repriced ? translate("features.settings.categories.form.saved_repriced", { count: repriced }) : translate("features.settings.categories.form.saved"),
    })
    emit("close", true)
  },
  onError: (error) => showToast.error({ title: translate("features.settings.categories.form.error"), description: getApiErrorMessage(error, translate("utils.common.load_error")) }),
})

const submit = async () => {
  if (markupChanged.value) {
    const confirmed = await previewModal.open({ load: async () => (await previewCategoryMarkup(props.category.id, markupValue.value)).data! })
    if (!confirmed) return
  }
  mutate()
}

const isValid = computed(() => form.name.trim().length > 0 && form.sort_order !== undefined && form.sort_order !== null)
</script>

<template>
  <UModal :title="translate('features.settings.categories.form.title', { name: category.name })" :close="{ onClick: () => emit('close') }">
    <template #body>
      <form id="category-form" class="grid gap-x-4 gap-y-3 sm:grid-cols-2" @submit.prevent="isValid && submit()">
        <UFormField :label="translate('features.settings.categories.form.name')" required class="sm:col-span-2">
          <UInput v-model="form.name" maxlength="100" class="w-full" />
        </UFormField>
        <UFormField :label="translate('features.settings.categories.form.color')">
          <USelect v-model="form.color" :items="colorItems" class="w-full" />
        </UFormField>
        <UFormField :label="translate('features.settings.categories.form.sort_order')">
          <UInputNumber v-model="form.sort_order" :min="0" :max="1000" class="w-full" />
        </UFormField>
        <UFormField
          v-if="canManageMarkup"
          :label="translate('features.settings.categories.form.markup')"
          :description="translate('features.settings.categories.form.markup_help', { value: formatNumber(globalMarkup ?? 0, 'id-ID', 2) })"
          class="sm:col-span-2"
        >
          <UInputNumber v-model="form.markup_percent" :min="0" :max="1000" :step="0.5" :format-options="{ maximumFractionDigits: 2 }" class="w-full" />
        </UFormField>
        <div class="sm:col-span-2">
          <USwitch v-model="form.is_active" :label="translate('features.settings.categories.form.is_active')" />
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton :label="translate('utils.common.cancel')" color="neutral" variant="ghost" @click="emit('close')" />
        <UButton type="submit" form="category-form" :label="translate('utils.common.save')" :loading="isPending" :disabled="!isValid" />
      </div>
    </template>
  </UModal>
</template>
