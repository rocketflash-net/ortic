<script setup lang="ts">
import { id } from "@nuxt/ui/locale";
import { useHead } from "@unhead/vue";

// Light-only store theme; the browser bar matches the blue header.
useHead({
  meta: [
    { name: "theme-color", content: "#1438c8" },
    { name: "color-scheme", content: "light" },
  ],
});
</script>

<template>
  <Suspense>
    <!-- Built-in Nuxt UI labels (close buttons, color mode, etc.) in Indonesian, matching the app's default locale. -->
    <!-- Toasts just below the header: at the bottom they would cover the phone navigation bar, at the very top the search box. -->
    <UApp :locale="id" :toaster="{ position: 'top-center', max: 1, duration: 3000, ui: { viewport: 'top-18' } }">
      <RouterView />
    </UApp>
  </Suspense>
</template>
