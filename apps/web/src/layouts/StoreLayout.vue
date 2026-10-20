<script setup lang="ts">
import { storeToRefs } from "pinia"
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import logoUrl from "@/assets/logo-horizontal-white.svg"
import { AccountPageName } from "@/features/account/models"
import { AuthenticationPageName } from "@/features/authentication/models"
import { useAuthStore } from "@/features/authentication/stores/authentication.store"
import { CartPageName } from "@/features/cart/models"
import { useCartStore } from "@/features/cart/stores/cart.store"
import { CatalogPageName } from "@/features/catalog/models"
import { HelpPageName } from "@/features/help/models"
import { HomePageName } from "@/features/home/models"
import { LegalPageName } from "@/features/legal/models"
import { OrdersPageName } from "@/features/orders/models"
import { translate } from "@/plugins/language"
import { useStoreInfo } from "@/shared/composables/useStoreInfo"

/**
 * Store shell: blue header with logo, search, cart, and account; bottom navigation on phones (most buyers arrive from
 * the Instagram bio link); ink footer with the same watermark as the Instagram posts.
 */
const route = useRoute()
const router = useRouter()
const { userData } = storeToRefs(useAuthStore())
const { count: cartCount } = storeToRefs(useCartStore())
const { info: storeInfo, whatsappUrl, instagramUrl } = useStoreInfo()

const accountTo = computed(() => (userData.value ? { name: AccountPageName.ACCOUNT } : { name: AuthenticationPageName.LOGIN }))

// The header search mirrors `?q=` on the product list, so the box keeps the term after searching.
const searchTerm = ref("")
watch(
  () => route.query.q,
  (q) => {
    searchTerm.value = typeof q === "string" ? q : ""
  },
  { immediate: true },
)
const search = () => {
  const q = searchTerm.value.trim()
  router.push({ name: CatalogPageName.PRODUCTS, query: q ? { q } : {} })
}

const isActive = (name: string) => route.name === name

const bottomNav = computed(() => [
  {
    icon: "i-lucide-house",
    label: translate("utils.navigation.home"),
    to: { name: HomePageName.HOME },
    active: isActive(HomePageName.HOME),
  },
  {
    icon: "i-lucide-layout-grid",
    label: translate("utils.navigation.products"),
    to: { name: CatalogPageName.PRODUCTS },
    active: [CatalogPageName.PRODUCTS, CatalogPageName.CATEGORY, CatalogPageName.PRODUCT].includes(route.name as CatalogPageName),
  },
  {
    icon: "i-lucide-shopping-cart",
    label: translate("utils.navigation.cart"),
    to: { name: CartPageName.CART },
    active: isActive(CartPageName.CART),
    badge: cartCount.value,
  },
  {
    icon: "i-lucide-package",
    label: translate("utils.navigation.orders"),
    to: { name: OrdersPageName.ORDERS },
    active: isActive(OrdersPageName.ORDERS),
  },
  {
    icon: "i-lucide-user-round",
    label: translate("utils.navigation.account"),
    to: accountTo.value,
    active: isActive(AccountPageName.ACCOUNT) || isActive(AuthenticationPageName.LOGIN),
  },
])
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-default pb-16 md:pb-0">
    <header class="sticky top-0 z-30 bg-ortic-blue text-white shadow-sm">
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 md:gap-4">
        <RouterLink :to="{ name: HomePageName.HOME }" class="shrink-0" :aria-label="translate('utils.navigation.home')">
          <img :src="logoUrl" alt="Ortic" class="h-9 w-auto md:h-10" />
        </RouterLink>

        <form role="search" class="min-w-0 flex-1" @submit.prevent="search">
          <UInput
            v-model="searchTerm"
            type="search"
            :placeholder="translate('utils.search_placeholder')"
            icon="i-lucide-search"
            variant="none"
            size="md"
            class="w-full"
            :aria-label="translate('utils.search_placeholder')"
            :ui="{ base: 'rounded-full bg-white/95 text-ortic-ink placeholder:text-zinc-500' }"
          />
        </form>

        <div class="hidden items-center gap-2 md:flex">
          <UButton
            :to="{ name: HelpPageName.HELP }"
            :label="translate('utils.navigation.help')"
            color="neutral"
            variant="ghost"
            class="text-white hover:bg-white/10"
          />
          <UButton
            :to="{ name: OrdersPageName.ORDERS }"
            :label="translate('utils.navigation.orders')"
            color="neutral"
            variant="ghost"
            class="text-white hover:bg-white/10"
          />
          <UChip :text="cartCount" :show="cartCount > 0" color="secondary" size="3xl" inset>
            <UButton
              :to="{ name: CartPageName.CART }"
              icon="i-lucide-shopping-cart"
              color="neutral"
              variant="ghost"
              class="text-white hover:bg-white/10"
              :aria-label="translate('utils.navigation.cart')"
            />
          </UChip>
          <UButton
            :to="accountTo"
            :label="userData ? userData.name : translate('utils.navigation.login')"
            icon="i-lucide-user-round"
            color="secondary"
            class="btn-comic max-w-48 text-ortic-ink"
            :ui="{ label: 'truncate' }"
          />
        </div>
      </div>
    </header>

    <main class="flex-1">
      <RouterView />
    </main>

    <footer class="bg-ortic-ink text-white/80">
      <div class="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
        <div class="space-y-1">
          <p class="font-display text-2xl tracking-wide text-white">{{ storeInfo.store_name }}</p>
          <p>{{ storeInfo.store_address || "Medan & Pekanbaru" }}</p>
          <div class="flex flex-wrap gap-3 pt-1">
            <a v-if="whatsappUrl" :href="whatsappUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1 hover:text-white">
              <UIcon name="i-lucide-message-circle" class="size-4" />WhatsApp
            </a>
            <a v-if="instagramUrl" :href="instagramUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1 hover:text-white">
              <UIcon name="i-lucide-instagram" class="size-4" />@{{ storeInfo.store_instagram }}
            </a>
            <a v-if="storeInfo.store_email" :href="`mailto:${storeInfo.store_email}`" class="inline-flex items-center gap-1 hover:text-white">
              <UIcon name="i-lucide-mail" class="size-4" />{{ storeInfo.store_email }}
            </a>
          </div>
        </div>
        <nav class="flex flex-col gap-1.5">
          <RouterLink :to="{ name: CatalogPageName.PRODUCTS }" class="hover:text-white">{{ translate("utils.navigation.products") }}</RouterLink>
          <RouterLink :to="{ name: HelpPageName.HELP }" class="hover:text-white">{{ translate("utils.navigation.help") }}</RouterLink>
          <RouterLink :to="{ name: OrdersPageName.ORDERS }" class="hover:text-white">{{ translate("utils.navigation.orders") }}</RouterLink>
        </nav>
        <nav class="flex flex-col gap-1.5">
          <RouterLink :to="{ name: LegalPageName.TERMS }" class="hover:text-white">{{ translate("features.legal.terms") }}</RouterLink>
          <RouterLink :to="{ name: LegalPageName.PRIVACY }" class="hover:text-white">{{ translate("features.legal.privacy") }}</RouterLink>
          <RouterLink :to="{ name: LegalPageName.RETURNS }" class="hover:text-white">{{ translate("features.legal.returns") }}</RouterLink>
        </nav>
      </div>
      <p class="border-t border-white/10 px-4 py-4 text-center text-xs">© {{ new Date().getFullYear() }} {{ storeInfo.store_name }} · ortic.id</p>
    </footer>

    <!-- Bottom navigation (phones). -->
    <nav class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t-2 border-ortic-ink bg-white md:hidden">
      <RouterLink
        v-for="item in bottomNav"
        :key="item.label"
        :to="item.to"
        class="relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium"
        :class="item.active ? 'text-ortic-blue' : 'text-ortic-ink'"
      >
        <UIcon :name="item.icon" class="size-5" />
        <span
          v-if="item.badge"
          class="absolute top-1 left-1/2 ms-1.5 min-w-4 rounded-full border border-ortic-ink bg-ortic-yellow px-1 text-center text-[10px] leading-4 font-bold text-ortic-ink"
        >
          {{ item.badge > 99 ? "99+" : item.badge }}
        </span>
        {{ item.label }}
      </RouterLink>
    </nav>
  </div>
</template>
