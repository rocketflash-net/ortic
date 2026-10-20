<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query"

import { translate } from "@/plugins/language"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { formatCurrency } from "@/shared/helpers/number"

import type { PricingPreview } from "../models"

/**
 * Shows which variant prices a markup/rounding change would recalculate, before saving. Resolves `true` when the
 * user confirms. `load` runs the matching preview endpoint.
 */
const props = defineProps<{ load: () => Promise<PricingPreview> }>()
const emit = defineEmits<{ close: [confirmed: boolean] }>()

const previewQuery = useQuery({ queryKey: ["pricing-preview", Math.random()], queryFn: props.load, gcTime: 0 })
</script>

<template>
  <UModal
    :title="translate('features.settings.store.preview.title')"
    :description="translate('features.settings.store.preview.description')"
    :close="{ onClick: () => emit('close', false) }"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <QueryErrorAlert
        v-if="previewQuery.isError.value"
        :title="translate('features.settings.store.preview.error')"
        :error="previewQuery.error.value"
        @retry="previewQuery.refetch()"
      />
      <div v-else-if="previewQuery.isPending.value" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-muted" />
      </div>
      <div v-else-if="previewQuery.data.value" class="space-y-3">
        <p class="font-medium text-highlighted">
          {{
            previewQuery.data.value.affected_variants
              ? translate("features.settings.store.preview.summary", {
                  count: previewQuery.data.value.affected_variants,
                  up: previewQuery.data.value.increased,
                  down: previewQuery.data.value.decreased,
                })
              : translate("features.settings.store.preview.none")
          }}
        </p>
        <div v-if="previewQuery.data.value.samples.length" class="overflow-x-auto rounded-lg border border-default">
          <table class="w-full text-sm">
            <thead class="bg-elevated text-left text-muted">
              <tr>
                <th class="px-3 py-2 font-medium">{{ translate("features.settings.store.preview.product") }}</th>
                <th class="px-3 py-2 text-right font-medium">{{ translate("features.settings.store.preview.before") }}</th>
                <th class="px-3 py-2 text-right font-medium">{{ translate("features.settings.store.preview.after") }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="sample in previewQuery.data.value.samples" :key="sample.variant_id">
                <td class="px-3 py-2">
                  <p class="text-highlighted">{{ sample.product_name }}</p>
                  <p class="text-xs text-muted">{{ [sample.variant_name, sample.sku].filter(Boolean).join(" · ") }}</p>
                </td>
                <td class="px-3 py-2 text-right text-muted tabular-nums line-through">{{ formatCurrency(sample.before) }}</td>
                <td class="px-3 py-2 text-right font-medium tabular-nums" :class="sample.after > sample.before ? 'text-warning' : 'text-success'">
                  {{ formatCurrency(sample.after) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="previewQuery.data.value.affected_variants > previewQuery.data.value.samples.length" class="text-sm text-muted">
          {{ translate("features.settings.store.preview.more", { count: previewQuery.data.value.affected_variants - previewQuery.data.value.samples.length }) }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton :label="translate('utils.common.cancel')" color="neutral" variant="ghost" @click="emit('close', false)" />
        <UButton :label="translate('features.settings.store.preview.confirm')" :disabled="!previewQuery.isSuccess.value" @click="emit('close', true)" />
      </div>
    </template>
  </UModal>
</template>
