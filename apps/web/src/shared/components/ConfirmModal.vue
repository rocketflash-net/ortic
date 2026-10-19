<script setup lang="ts">
import { translate } from "@/plugins/language"

/**
 * Asks the user to confirm a destructive action. Opened through `useOverlay`.
 *
 * @remarks
 * Closes with `true` only when the user confirms.
 */
defineProps<{
  title: string
  description: string
  confirmLabel: string
}>()

const emit = defineEmits<{
  close: [confirmed: boolean]
}>()
</script>

<template>
  <UModal :title="title" :description="description" :close="{ onClick: () => emit('close', false) }">
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton :label="translate('utils.common.cancel')" color="neutral" variant="ghost" @click="emit('close', false)" />
        <UButton :label="confirmLabel" color="error" @click="emit('close', true)" />
      </div>
    </template>
  </UModal>
</template>
