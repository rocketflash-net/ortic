<!-- src/shared/components/BaseFormField.vue -->
<script setup lang="ts">
import { computed, useId } from "vue"

import type { BaseFormFieldProps } from "../models"

/**
 * Accessible form field wrapper with reserved space for labels and messages.
 *
 * @remarks
 * Responsibilities:
 * - Layout and accessibility wiring only
 * - Prevents layout shift by reserving message row height
 * - Does **not** manage form state or validation logic
 *
 * The parent form owns value binding and validation. This component only
 * renders structure and ARIA attributes via {@link BaseFormFieldProps}.
 */
const {
  label = "",
  fieldName = "",
  error = null,
  required = false,
  hint = "",
  disabled = false,
} = defineProps<BaseFormFieldProps>()

/**
 * Fallback ID used when {@link BaseFormFieldProps.fieldName} is not provided.
 */
const uid = useId()

/**
 * Whether the field should display an error message.
 *
 * @remarks Disabled fields never show errors even when `error` is set.
 */
const hasError = computed(() => Boolean(error) && !disabled)

/** DOM id for the error message, referenced by `aria-describedby`. */
const errorId = computed(() => (hasError.value ? `${fieldName || uid}-error` : undefined))

/** DOM id for the hint message, referenced by `aria-describedby`. */
const hintId = computed(() => (hint && !hasError.value ? `${fieldName || uid}-hint` : undefined))

/**
 * Combined `aria-describedby` target.
 *
 * @remarks Error text takes priority over hint text.
 */
const describedBy = computed(() => errorId.value || hintId.value)
</script>

<template>
  <div class="flex flex-col gap-1">
    <!-- Label (reserved height to prevent layout shift) -->
    <label
      :for="fieldName || undefined"
      class="min-h-2 ml-2 text-sm font-medium flex items-end transition"
      :class="disabled ? 'text-dimmed' : 'text-default'"
    >
      <slot name="label">
        <span :class="label ? '' : 'invisible'">
          {{ label || "placeholder" }}
        </span>
      </slot>

      <span v-if="required && !disabled && label" class="ml-0.5 text-error" aria-hidden="true">
        *
      </span>
    </label>

    <!-- Input -->
    <div
      class="flex items-center min-h-[3rem]"
      :aria-invalid="hasError"
      :aria-describedby="describedBy"
    >
      <slot />
    </div>

    <!-- Message row (reserved height, no fake content) -->
    <div class="min-h-2 text-sm ml-2" aria-live="polite">
      <p v-if="hasError" :id="errorId" class="text-error">
        {{ error }}
      </p>

      <p v-else-if="hint" :id="hintId" class="text-muted">
        {{ hint }}
      </p>
    </div>
  </div>
</template>
