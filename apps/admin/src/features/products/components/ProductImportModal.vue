<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query"
import { computed, ref, useTemplateRef } from "vue"

import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import { getApiErrorMessage, getApiFieldErrors } from "@/shared/helpers/error"

import type { ProductImportResult } from "../models"
import { importProducts, productQueryKeys } from "../services/api"

/**
 * Product CSV import in two steps: the file is checked first (dry run: counts and issues per row), then imported.
 * Rows are matched by SKU; new products are created as Draft because they still need photos.
 */
const emit = defineEmits<{ close: [imported?: boolean] }>()

const queryClient = useQueryClient()
const { showToast } = useAppToast()
const fileInput = useTemplateRef<HTMLInputElement>("fileInput")

const MAX_BYTES = 5 * 1024 * 1024
const fileName = ref("")
const csv = ref("")
const preview = ref<ProductImportResult | null>(null)
const fileError = ref<string>()

const { mutate: check, isPending: isChecking } = useMutation({
  mutationFn: () => importProducts(csv.value, true),
  onSuccess: (response) => {
    preview.value = response.data
  },
  onError: (error) => {
    preview.value = null
    fileError.value = getApiFieldErrors(error)[0]?.message ?? getApiErrorMessage(error, translate("utils.common.load_error"))
  },
})

const { mutate: apply, isPending: isImporting } = useMutation({
  mutationFn: () => importProducts(csv.value, false),
  onSuccess: (response) => {
    const result = response.data!
    if (result.issues.length) {
      preview.value = result
      return
    }
    queryClient.invalidateQueries({ queryKey: productQueryKeys.all })
    showToast.success({
      title: translate("features.products.import.done", { created: result.products_created + result.variants_created, updated: result.variants_updated }),
    })
    emit("close", true)
  },
  onError: (error) => showToast.error({ title: translate("features.products.import.error"), description: getApiErrorMessage(error) }),
})

const onFile = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  preview.value = null
  fileError.value = undefined
  if (file.size > MAX_BYTES) {
    fileError.value = translate("features.products.import.too_large")
    return
  }
  fileName.value = file.name
  csv.value = await file.text()
  check()
}

const canImport = computed(() => Boolean(preview.value && preview.value.issues.length === 0 && preview.value.rows > 0))
</script>

<template>
  <UModal :title="translate('features.products.import.title')" :description="translate('features.products.import.description')" :close="{ onClick: () => emit('close') }" :ui="{ content: 'sm:max-w-2xl' }">
    <template #body>
      <div class="space-y-4">
        <ul class="list-disc space-y-1 ps-5 text-sm text-muted">
          <li>{{ translate("features.products.import.hint_template") }}</li>
          <li>{{ translate("features.products.import.hint_sku") }}</li>
          <li>{{ translate("features.products.import.hint_draft") }}</li>
        </ul>

        <input ref="fileInput" type="file" accept=".csv,text/csv" class="hidden" @change="onFile" />
        <div class="flex flex-wrap items-center gap-3">
          <UButton :label="translate('features.products.import.choose')" icon="i-lucide-file-up" color="neutral" variant="outline" :loading="isChecking" @click="fileInput?.click()" />
          <span v-if="fileName" class="truncate text-sm text-toned">{{ fileName }}</span>
        </div>
        <UAlert v-if="fileError" color="error" variant="subtle" icon="i-lucide-circle-x" :description="fileError" />

        <template v-if="preview">
          <div class="grid gap-3 sm:grid-cols-4">
            <div class="rounded-lg bg-elevated p-3">
              <p class="text-xs text-muted">{{ translate("features.products.import.rows") }}</p>
              <p class="text-lg font-semibold text-highlighted">{{ preview.rows }}</p>
            </div>
            <div class="rounded-lg bg-elevated p-3">
              <p class="text-xs text-muted">{{ translate("features.products.import.products_created") }}</p>
              <p class="text-lg font-semibold text-highlighted">{{ preview.products_created }}</p>
            </div>
            <div class="rounded-lg bg-elevated p-3">
              <p class="text-xs text-muted">{{ translate("features.products.import.variants_created") }}</p>
              <p class="text-lg font-semibold text-highlighted">{{ preview.variants_created }}</p>
            </div>
            <div class="rounded-lg bg-elevated p-3">
              <p class="text-xs text-muted">{{ translate("features.products.import.variants_updated") }}</p>
              <p class="text-lg font-semibold text-highlighted">{{ preview.variants_updated }}</p>
            </div>
          </div>

          <UAlert v-if="!preview.issues.length" color="success" variant="subtle" icon="i-lucide-circle-check" :description="translate('features.products.import.ready')" />
          <div v-else class="space-y-2">
            <p class="text-sm font-medium text-error">{{ translate("features.products.import.issues", { count: preview.issues.length }) }}</p>
            <ul class="max-h-56 divide-y divide-default overflow-y-auto rounded-lg border border-default text-sm">
              <li v-for="(issue, index) in preview.issues" :key="index" class="flex gap-3 px-3 py-2">
                <span class="shrink-0 font-medium text-highlighted tabular-nums">{{ translate("features.products.import.row", { row: issue.row }) }}</span>
                <span class="shrink-0 text-muted">{{ issue.field }}</span>
                <span class="text-toned">{{ issue.message }}</span>
              </li>
            </ul>
          </div>
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton :label="translate('utils.common.cancel')" color="neutral" variant="ghost" @click="emit('close')" />
        <UButton :label="translate('features.products.import.submit')" icon="i-lucide-upload" :loading="isImporting" :disabled="!canImport" @click="apply()" />
      </div>
    </template>
  </UModal>
</template>
