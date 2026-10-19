<script setup lang="ts">
import { computed, watch } from "vue"

import { translate } from "@/plugins/language"
import { formatNumber } from "@/shared/helpers/number"
import { DEFAULT_PAGE_SIZES } from "@/shared/helpers/query-param"

/**
 * Footer for server-paginated tables: range summary, page size, and page links.
 *
 * @remarks
 * Changing the page size resets the page to 1, and a page beyond the last one
 * (e.g. `?page=999` from a stale link) is moved to the last page once the total is known.
 */
const { total, pageSizes = [...DEFAULT_PAGE_SIZES] } = defineProps<{
  /** Total records across every page. */
  total: number
  pageSizes?: number[]
}>()

const page = defineModel<number>("page", { required: true })
const limit = defineModel<number>("limit", { required: true })

const lastPage = computed(() => Math.max(Math.ceil(total / limit.value), 1))

watch([() => total, page, lastPage], () => {
  if (total > 0 && page.value > lastPage.value) page.value = lastPage.value
})

const range = computed(() => {
  if (total === 0) {
    return { from: 0, to: 0 }
  }

  const from = (page.value - 1) * limit.value + 1
  return { from, to: Math.min(page.value * limit.value, total) }
})

const pageSizeItems = computed(() => pageSizes.map((size) => ({ label: String(size), value: size })))

function onLimitChange(value: number) {
  limit.value = value
  page.value = 1
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
    <div class="flex items-center gap-3 text-sm text-muted">
      <span class="tabular-nums">
        {{
          translate("utils.common.pagination_summary", {
            from: formatNumber(range.from),
            to: formatNumber(range.to),
            total: formatNumber(total),
          })
        }}
      </span>

      <span class="hidden sm:inline" aria-hidden="true">/</span>

      <label class="hidden items-center gap-2 whitespace-nowrap sm:flex">
        {{ translate("utils.common.rows_per_page") }}
        <USelect
          :model-value="limit"
          :items="pageSizeItems"
          size="sm"
          variant="outline"
          class="w-20"
          :ui="{ base: 'tabular-nums' }"
          @update:model-value="onLimitChange"
        />
      </label>
    </div>

    <UPagination
      v-model:page="page"
      :total="total"
      :items-per-page="limit"
      :sibling-count="1"
      size="sm"
      variant="ghost"
      active-variant="soft"
    />
  </div>
</template>
