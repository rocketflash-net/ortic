<script setup lang="ts">
/**
 * Shared page chrome for authentication views.
 *
 * @remarks
 * Provides a consistent title, optional description, and default slot for form content.
 * Does not handle layout chrome such as the sidebar or color-mode toggle —
 * that belongs to {@link AuthenticationLayout}.
 */
defineProps<{
  /** Primary heading shown above the form. */
  title: string
  /** Optional supporting copy displayed below the title. */
  description?: string
}>()
</script>

<template>
  <section class="w-full space-y-8">
    <header class="space-y-2">
      <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-highlighted">
        {{ title }}
      </h1>
      <p v-if="description" class="text-sm leading-relaxed text-muted">
        {{ description }}
      </p>
    </header>

    <div>
      <slot />
    </div>
  </section>
</template>
