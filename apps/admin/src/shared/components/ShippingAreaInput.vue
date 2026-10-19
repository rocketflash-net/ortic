<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query"
import { refDebounced } from "@vueuse/core"
import { computed, ref } from "vue"

import { translate } from "@/plugins/language"
import type { ShippingArea } from "@/shared/models/shipping"
import { searchShippingAreas, shippingAreaQueryKeys } from "@/shared/services/shipping-areas"

/**
 * Autocomplete for a Biteship area (district + postal code). Emits the picked area.
 *
 * @remarks
 * Biteship bills every search, so it waits for 3+ characters and a 400 ms pause, and caches results.
 */
const model = defineModel<ShippingArea | undefined>()

const searchTerm = ref("")
const debouncedSearch = refDebounced(searchTerm, 400)
const query = computed(() => debouncedSearch.value.trim())

const { data, isFetching } = useQuery({
  queryKey: computed(() => shippingAreaQueryKeys.search(query.value)),
  queryFn: () => searchShippingAreas(query.value),
  enabled: computed(() => query.value.length >= 3),
  staleTime: Infinity,
})

// Keep the picked area in the list so the input can show its label.
const items = computed(() => {
  const areas = data.value?.data ?? []
  return model.value && !areas.some((area) => area.id === model.value?.id) ? [model.value, ...areas] : areas
})
</script>

<template>
  <UInputMenu
    v-model="model"
    v-model:search-term="searchTerm"
    :items="items"
    label-key="label"
    by="id"
    :loading="isFetching"
    ignore-filter
    icon="i-lucide-map-pin"
    :placeholder="translate('utils.shipping_area.placeholder')"
    class="w-full"
  >
    <template #empty>
      {{ query.length >= 3 ? translate("utils.shipping_area.empty") : translate("utils.shipping_area.min") }}
    </template>
  </UInputMenu>
</template>
