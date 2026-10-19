<script setup lang="ts">
import { id } from "@nuxt/ui/locale";
import { useColorMode } from "@vueuse/core";
import { computed } from "vue";
import { useHead } from "@unhead/vue";

const colorMode = useColorMode();

const themeColor = computed(() => {
  return colorMode.value === "dark" ? "#18181b" : "#ffffff";
});

useHead({
  meta: [
    {
      name: "theme-color",
      content: themeColor,
    },
  ],
});
</script>

<template>
  <Suspense>
    <!-- Built-in Nuxt UI labels (close buttons, color mode, etc.) in Indonesian, matching the app's default locale. -->
    <UApp :locale="id">
      <RouterView />
    </UApp>
  </Suspense>
</template>
