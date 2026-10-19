<script setup lang="ts">
import { computed } from "vue"

import { translate } from "@/plugins/language"
import { formatCurrency } from "@/shared/helpers/number"

/**
 * A price with its normal price struck through when it is discounted, plus a "-20%" badge. Without a discount it
 * shows the price alone, so every price in the app can use it.
 *
 * @remarks
 * `format` turns the final amount into text, e.g. "from Rp 50.000"; the struck-through price is always plain.
 */
const {
  price,
  finalPrice,
  format = formatCurrency,
} = defineProps<{
  /** Normal price. */
  price: number
  /** Price charged now. */
  finalPrice: number
  format?: (amount: number) => string
}>()

const isDiscounted = computed(() => finalPrice < price)
const percentOff = computed(() => Math.round(((price - finalPrice) / price) * 100))
</script>

<template>
  <span class="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
    <template v-if="isDiscounted">
      <s
        class="text-xs font-normal text-dimmed tabular-nums"
        :aria-label="translate('utils.price.normal', { price: formatCurrency(price) })"
      >
        {{ formatCurrency(price) }}
      </s>
      <span class="tabular-nums" :aria-label="translate('utils.price.discounted', { price: format(finalPrice) })">
        {{ format(finalPrice) }}
      </span>
      <UBadge
        v-if="percentOff > 0"
        :label="translate('utils.price.off_percent', { value: percentOff })"
        color="success"
        variant="subtle"
        size="sm"
        class="self-center"
      />
    </template>
    <span v-else class="tabular-nums">{{ format(finalPrice) }}</span>
  </span>
</template>
