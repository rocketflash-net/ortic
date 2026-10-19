<script setup lang="ts">
import { HomePageName } from "@/features/home/models";
import { translate } from "@/plugins/language";
import BrandLogo from "@/shared/components/BrandLogo.vue";
</script>
<template>
  <div class="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <!-- Panel brand: biru Ortic dengan tekstur halftone dan tiga warna feed Instagram. -->
    <aside
      class="relative hidden overflow-hidden bg-ortic-blue text-white lg:flex lg:flex-col"
      style="background-image: radial-gradient(rgb(255 255 255 / 0.12) 1px, transparent 1.5px); background-size: 10px 10px"
    >
      <div class="relative z-10 flex items-center gap-3 p-10 xl:p-14">
        <BrandLogo class="size-10" />
        <span class="text-lg font-semibold tracking-wide">{{ translate("features.authentication.layout.brand") }}</span>
      </div>

      <div class="relative z-10 flex flex-1 flex-col justify-center gap-5 px-10 xl:px-14">
        <div class="flex gap-2" aria-hidden="true">
          <span class="h-2 w-14 rounded-full bg-ortic-red" />
          <span class="h-2 w-14 rounded-full bg-ortic-yellow" />
          <span class="h-2 w-14 rounded-full bg-white" />
        </div>
        <h2 class="font-display text-6xl leading-none tracking-wide xl:text-7xl">{{ translate("features.authentication.layout.headline") }}</h2>
        <p class="max-w-md text-lg text-white/85">{{ translate("features.authentication.layout.tagline") }}</p>
      </div>

      <p class="relative z-10 p-10 text-sm text-white/70 xl:p-14">
        © {{ new Date().getFullYear() }} Ortic Indonesia · ortic.id
      </p>
    </aside>

    <main class="flex min-h-dvh flex-col bg-default">
      <header class="flex shrink-0 items-center justify-between border-b border-muted px-4 py-4 sm:px-8 lg:border-none">
        <div class="flex items-center gap-2.5 lg:hidden">
          <BrandLogo class="size-8" />
          <span class="text-base font-semibold text-highlighted">{{ translate("features.authentication.layout.brand") }}</span>
        </div>

        <div class="ms-auto">
          <UButton :to="{ name: HomePageName.HOME }" :label="translate('features.authentication.layout.back_to_store')" icon="i-lucide-arrow-left" color="neutral" variant="ghost" />
        </div>
      </header>

      <div class="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-12 lg:px-12 xl:px-16">
        <div class="w-full max-w-sm sm:max-w-2xl">
          <RouterView />
        </div>
      </div>
    </main>
  </div>
</template>
