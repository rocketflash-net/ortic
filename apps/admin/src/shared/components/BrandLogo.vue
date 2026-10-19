<script setup lang="ts">
import logoUrl from "@/assets/logo-mark.svg";
</script>

<!-- Logo Ortic: gigi teal di lingkaran hitam (sama di mode terang & gelap). Atur ukurannya lewat class (mis. size-8). -->
<template>
  <span class="inline-block">
    <img :src="logoUrl" alt="" class="size-full" />
  </span>
</template>
