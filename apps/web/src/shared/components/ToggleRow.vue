<script setup lang="ts">
/**
 * On/off setting shown as a bordered row: label and description on the left, switch on the right. Used for
 * section toggles such as the digital gift parts or a session's calendar reminder.
 */
defineProps<{
  label: string
  description?: string
  disabled?: boolean
}>()

const enabled = defineModel<boolean>({ required: true })
</script>

<template>
  <USwitch
    v-model="enabled"
    size="md"
    :label="label"
    :description="description"
    :disabled="disabled"
    :ui="{ root: 'flex-row-reverse justify-between gap-4', wrapper: 'ms-0' }"
    class="rounded-lg p-3 ring ring-default"
  />
</template>
