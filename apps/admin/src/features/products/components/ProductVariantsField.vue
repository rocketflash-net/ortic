<script setup lang="ts">
import { translate } from "@/plugins/language"
import { formatCurrency, formatNumber } from "@/shared/helpers/number"

import { emptyVariant, type VariantForm } from "../helpers/form"
import { effectiveMarkup, sellingPrice } from "../helpers/price"
import type { PricingDefaults } from "../models"

/**
 * Variant rows: name, SKU, price, weight, package size, active.
 *
 * @remarks
 * Owner (`canManagePrices`): base price, optional variant markup, and a lock for a hand-set selling price; the
 * selling price of unlocked rows is previewed with the same formula as the API.
 * Staff: sets the selling price of new variants only (saved locked); existing prices are read-only.
 */
const props = defineProps<{
  canManagePrices: boolean
  /** Product markup from the form; undefined = global. */
  productMarkup?: number
  /** Global markup & rounding (Owner only). */
  pricing?: PricingDefaults
  /** API field errors keyed by path, e.g. `variants.0.sku`. */
  errors: Record<string, string>
}>()
const variants = defineModel<VariantForm[]>({ required: true })

const currencyFormat = { style: "currency", currency: "IDR", maximumFractionDigits: 0 } as const

const productOrGlobalMarkup = () => props.productMarkup ?? props.pricing?.markup_percent ?? 0

const previewPrice = (variant: VariantForm): number | undefined => {
  if (variant.base_price === undefined || !props.pricing) return undefined
  return sellingPrice(variant.base_price, effectiveMarkup(variant.markup_percent, props.productMarkup, props.pricing.markup_percent), props.pricing.price_rounding)
}

const errorOf = (index: number, field: string) => props.errors[`variants.${index}.${field}`]

const add = () => {
  variants.value = [...variants.value, emptyVariant()]
}

const remove = (index: number) => {
  variants.value = variants.value.filter((_, position) => position !== index)
}

// Locking keeps the previewed price as the starting value.
const toggleLock = (variant: VariantForm, locked: boolean) => {
  variant.price_locked = locked
  if (locked && variant.price === undefined) variant.price = previewPrice(variant)
}
</script>

<template>
  <div class="space-y-4">
    <p v-if="errors.variants" class="text-sm text-error">{{ errors.variants }}</p>

    <div v-for="(variant, index) in variants" :key="variant.key" class="space-y-4 rounded-lg border border-default p-4" :class="{ 'bg-elevated/40': !variant.is_active }">
      <div class="flex items-center justify-between gap-3">
        <p class="min-w-0 truncate font-medium text-highlighted">
          {{ variant.name.trim() || translate("features.products.form.variants.unnamed", { index: index + 1 }) }}
        </p>
        <div class="flex shrink-0 items-center gap-3">
          <USwitch v-model="variant.is_active" :label="translate('features.products.form.variants.active')" size="sm" />
          <UTooltip :text="variants.length === 1 ? translate('features.products.form.variants.remove_last') : translate('features.products.form.variants.remove')">
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="sm"
              :disabled="variants.length === 1"
              :aria-label="translate('features.products.form.variants.remove')"
              @click="remove(index)"
            />
          </UTooltip>
        </div>
      </div>
      <p v-if="!variant.is_active" class="-mt-2 text-sm text-muted">{{ translate("features.products.form.variants.inactive_hint") }}</p>

      <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
        <UFormField :label="translate('features.products.form.variants.name')" :error="errorOf(index, 'name')">
          <UInput
            v-model="variant.name"
            maxlength="150"
            :placeholder="variants.length === 1 ? translate('features.products.form.variants.single_name_placeholder') : translate('features.products.form.variants.name_placeholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="translate('features.products.form.variants.sku')" :error="errorOf(index, 'sku')">
          <UInput v-model="variant.sku" maxlength="64" :placeholder="translate('features.products.form.variants.sku_placeholder')" class="w-full uppercase" />
        </UFormField>

        <!-- Owner pricing -->
        <template v-if="canManagePrices">
          <UFormField :label="translate('features.products.form.variants.base_price')" :description="translate('features.products.form.variants.base_price_help')" :error="errorOf(index, 'base_price')" required>
            <UInputNumber v-model="variant.base_price" :min="0" :step="500" :format-options="currencyFormat" locale="id-ID" class="w-full" />
          </UFormField>
          <UFormField :label="translate('features.products.form.variants.markup')" :error="errorOf(index, 'markup_percent')">
            <UInputNumber
              v-model="variant.markup_percent"
              :min="0"
              :max="1000"
              :step="0.5"
              :format-options="{ maximumFractionDigits: 2 }"
              :placeholder="translate('features.products.form.variants.markup_placeholder', { value: formatNumber(productOrGlobalMarkup(), 'id-ID', 2) })"
              class="w-full"
            />
          </UFormField>

          <div class="space-y-2 sm:col-span-2">
            <USwitch
              :model-value="variant.price_locked"
              :label="translate('features.products.form.variants.lock_price')"
              :description="translate('features.products.form.variants.lock_price_help')"
              @update:model-value="toggleLock(variant, $event)"
            />
          </div>

          <UFormField :label="translate('features.products.form.variants.price')" :error="errorOf(index, 'price')" :required="variant.price_locked">
            <UInputNumber v-if="variant.price_locked" v-model="variant.price" :min="0" :step="500" :format-options="currencyFormat" locale="id-ID" class="w-full" />
            <div v-else class="rounded-md bg-elevated px-3 py-2">
              <p class="font-semibold text-highlighted tabular-nums">{{ previewPrice(variant) !== undefined ? formatCurrency(previewPrice(variant)!) : "–" }}</p>
              <p v-if="pricing && variant.base_price !== undefined" class="text-xs text-muted">
                {{
                  translate("features.products.form.variants.price_auto", {
                    base: formatCurrency(variant.base_price),
                    markup: formatNumber(effectiveMarkup(variant.markup_percent, productMarkup, pricing.markup_percent), "id-ID", 2),
                    rounding: formatNumber(pricing.price_rounding),
                  })
                }}
              </p>
            </div>
          </UFormField>
          <UFormField :label="translate('features.products.form.variants.compare_at_price')" :description="translate('features.products.form.variants.compare_at_help')" :error="errorOf(index, 'compare_at_price')">
            <UInputNumber v-model="variant.compare_at_price" :min="0" :step="500" :format-options="currencyFormat" locale="id-ID" class="w-full" />
          </UFormField>
        </template>

        <!-- Staff pricing -->
        <template v-else>
          <UFormField
            v-if="variant.id === undefined"
            :label="translate('features.products.form.variants.price')"
            :description="translate('features.products.form.variants.price_staff_new')"
            :error="errorOf(index, 'price')"
            required
            class="sm:col-span-2"
          >
            <UInputNumber v-model="variant.price" :min="0" :step="500" :format-options="currencyFormat" locale="id-ID" class="w-full" />
          </UFormField>
          <UFormField v-else :label="translate('features.products.form.variants.price')" :description="translate('features.products.form.variants.price_staff_existing')" class="sm:col-span-2">
            <p class="rounded-md bg-elevated px-3 py-2 font-semibold text-highlighted tabular-nums">{{ formatCurrency(variant.price ?? 0) }}</p>
          </UFormField>
        </template>

        <UFormField :label="translate('features.products.form.variants.weight')" :error="errorOf(index, 'weight_gram')" required>
          <UInputNumber v-model="variant.weight_gram" :min="1" :max="500000" :step="10" class="w-full" />
        </UFormField>
        <UFormField :label="translate('features.products.form.variants.dimensions')">
          <div class="grid grid-cols-3 gap-2">
            <UInputNumber v-model="variant.length_cm" :min="0" :max="10000" :step="0.1" :increment="false" :decrement="false" :format-options="{ maximumFractionDigits: 1 }" :placeholder="translate('features.products.form.variants.length')" />
            <UInputNumber v-model="variant.width_cm" :min="0" :max="10000" :step="0.1" :increment="false" :decrement="false" :format-options="{ maximumFractionDigits: 1 }" :placeholder="translate('features.products.form.variants.width')" />
            <UInputNumber v-model="variant.height_cm" :min="0" :max="10000" :step="0.1" :increment="false" :decrement="false" :format-options="{ maximumFractionDigits: 1 }" :placeholder="translate('features.products.form.variants.height')" />
          </div>
        </UFormField>
      </div>
    </div>

    <UButton :label="translate('features.products.form.variants.add')" icon="i-lucide-plus" color="neutral" variant="outline" @click="add" />
  </div>
</template>
