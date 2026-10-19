<script setup lang="ts">
/**
 * Toolbar above a list table: search on the left, filters on the right.
 *
 * @remarks
 * On phones the two rows stack and the search takes the full width; filters that are wider than the screen
 * (e.g. status tabs) scroll horizontally instead of squeezing the search box.
 */
defineSlots<{
  /** Search field. */
  default(): unknown
  /** Optional filters such as status tabs or a date range. */
  filters?(): unknown
}>()
</script>

<template>
  <UDashboardToolbar
    :ui="{ root: 'flex-col items-stretch gap-2 py-2 overflow-x-visible sm:flex-row sm:items-center sm:gap-3' }"
  >
    <div class="w-full sm:w-72 sm:shrink-0">
      <slot />
    </div>

    <div
      v-if="$slots.filters"
      class="-mx-4 flex min-w-0 items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:justify-end sm:px-0"
    >
      <slot name="filters" />
    </div>
  </UDashboardToolbar>
</template>
