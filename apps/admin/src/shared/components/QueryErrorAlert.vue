<script setup lang="ts">
import { translate } from "@/plugins/language"
import { getApiErrorMessage } from "@/shared/helpers/error"

/**
 * Error state for a failed query, with a retry action.
 */
defineProps<{
  title: string
  /** Rejection value from the query. */
  error: unknown
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <UAlert
    class="shrink-0"
    color="error"
    variant="subtle"
    icon="i-lucide-circle-alert"
    :title="title"
    :description="getApiErrorMessage(error, translate('utils.common.load_error'))"
    :actions="[
      {
        label: translate('utils.common.try_again'),
        color: 'error',
        variant: 'outline',
        onClick: () => emit('retry'),
      },
    ]"
  />
</template>
