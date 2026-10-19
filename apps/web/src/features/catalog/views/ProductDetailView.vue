<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query"
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"

import { CartPageName } from "@/features/cart/models"
import { useCartStore } from "@/features/cart/stores/cart.store"
import { HomePageName } from "@/features/home/models"
import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { getApiErrorCode } from "@/shared/helpers/error"
import { formatCurrency, formatNumber } from "@/shared/helpers/number"
import NotFoundView from "@/shared/views/NotFoundView.vue"

import { CatalogPageName } from "../models"
import { getCatalogProduct, productQueryKeys } from "../services/api"

/**
 * Product page: photo gallery, variant choice, price, quantity, and add to cart; then description and specifications.
 */
const props = defineProps<{ slug: string }>()

const router = useRouter()
const cart = useCartStore()
const { showToast } = useAppToast()

const productQuery = useQuery({
  queryKey: computed(() => productQueryKeys.detail(props.slug)),
  queryFn: () => getCatalogProduct(props.slug),
  select: (response) => response.data!,
  retry: (count, error) => getApiErrorCode(error) !== "44" && count < 2,
})
const product = computed(() => productQuery.data.value)
const isNotFound = computed(() => getApiErrorCode(productQuery.error.value) === "44")

const activeImage = ref(0)
const variantId = ref<number>()
const quantity = ref(1)

// Default to the cheapest variant (the API sorts by price) whenever another product opens.
watch(
  product,
  (value) => {
    activeImage.value = 0
    quantity.value = 1
    variantId.value = value?.variants[0]?.id
  },
  { immediate: true },
)

const variant = computed(() => product.value?.variants.find((item) => item.id === variantId.value))
const hasVariants = computed(() => (product.value?.variants.length ?? 0) > 1 || Boolean(product.value?.variants[0]?.name))
const specs = computed(() => Object.entries(product.value?.specifications ?? {}))

const addToCart = () => {
  if (!product.value || !variant.value) return
  cart.add(
    {
      variant_id: variant.value.id,
      product_slug: product.value.slug,
      product_name: product.value.name,
      variant_name: variant.value.name,
      sku: variant.value.sku,
      price: variant.value.price,
      image_url: product.value.images[0]?.url ?? null,
      weight_gram: variant.value.weight_gram,
    },
    quantity.value ?? 1,
  )
  showToast.success({
    title: translate("features.catalog.detail.added"),
    description: [product.value.name, variant.value.name].filter(Boolean).join(" · "),
    actions: [{ label: translate("features.catalog.detail.view_cart"), color: "neutral", variant: "outline", onClick: () => router.push({ name: CartPageName.CART }) }],
  })
}
</script>

<template>
  <NotFoundView v-if="isNotFound" />

  <section v-else class="mx-auto max-w-6xl px-4 py-6">
    <QueryErrorAlert v-if="productQuery.isError.value" :title="translate('features.catalog.detail.load_error')" :error="productQuery.error.value" @retry="productQuery.refetch()" />

    <div v-else-if="!product" class="grid gap-8 md:grid-cols-2">
      <USkeleton class="aspect-square rounded-xl" />
      <div class="space-y-4">
        <USkeleton class="h-6 w-1/3" />
        <USkeleton class="h-10 w-3/4" />
        <USkeleton class="h-8 w-1/2" />
      </div>
    </div>

    <template v-else>
      <!-- Breadcrumb -->
      <nav class="flex flex-wrap items-center gap-1 text-sm text-muted" aria-label="Breadcrumb">
        <RouterLink :to="{ name: HomePageName.HOME }" class="hover:text-ortic-blue">{{ translate("features.catalog.detail.home") }}</RouterLink>
        <UIcon name="i-lucide-chevron-right" class="size-4" />
        <RouterLink :to="{ name: CatalogPageName.CATEGORY, params: { slug: product.category.slug } }" class="hover:text-ortic-blue">{{ product.category.name }}</RouterLink>
      </nav>

      <div class="mt-4 grid items-start gap-8 md:grid-cols-2">
        <!-- Gallery -->
        <div>
          <div class="relative aspect-square overflow-hidden rounded-xl border-2 border-ortic-ink bg-ortic-50 shadow-comic">
            <div class="absolute inset-0 bg-halftone opacity-60" aria-hidden="true" />
            <img
              v-if="product.images[activeImage]"
              :src="product.images[activeImage]!.url"
              :alt="product.name"
              class="relative size-full object-contain p-6"
            />
            <UIcon v-else name="i-lucide-image" class="relative m-auto size-12 text-zinc-400" />
          </div>
          <div v-if="product.images.length > 1" class="mt-3 flex gap-2 overflow-x-auto">
            <button
              v-for="(image, index) in product.images"
              :key="image.url"
              type="button"
              class="size-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 bg-ortic-50"
              :class="index === activeImage ? 'border-ortic-blue' : 'border-ortic-ink/30'"
              :aria-label="`${product.name} ${index + 1}`"
              @click="activeImage = index"
            >
              <img :src="image.url" alt="" class="size-full object-contain p-1" />
            </button>
          </div>
        </div>

        <!-- Buy box -->
        <div class="space-y-5">
          <div>
            <p v-if="product.brand_name" class="text-sm font-semibold tracking-wide text-ortic-blue uppercase">{{ product.brand_name }}</p>
            <h1 class="mt-1 font-display text-4xl leading-tight tracking-wide text-ortic-ink sm:text-5xl">{{ product.name }}</h1>
          </div>

          <div v-if="variant">
            <p v-if="variant.compare_at_price" class="text-sm text-zinc-500 line-through">{{ formatCurrency(variant.compare_at_price) }}</p>
            <p class="text-3xl font-bold text-ortic-ink">{{ formatCurrency(variant.price) }}</p>
          </div>

          <div v-if="hasVariants">
            <p class="mb-2 text-sm font-semibold text-ortic-ink">{{ translate("features.catalog.detail.variant") }}</p>
            <div class="flex flex-wrap gap-2" role="radiogroup" :aria-label="translate('features.catalog.detail.variant')">
              <button
                v-for="item in product.variants"
                :key="item.id"
                type="button"
                role="radio"
                :aria-checked="item.id === variantId"
                class="cursor-pointer rounded-lg border-2 px-3 py-2 text-left text-sm transition-colors"
                :class="item.id === variantId ? 'border-ortic-ink bg-ortic-yellow font-semibold text-ortic-ink shadow-comic' : 'border-ortic-ink/30 bg-white text-ortic-ink hover:border-ortic-ink'"
                @click="variantId = item.id"
              >
                {{ item.name ?? item.sku }}
                <span v-if="product.variants.some((other) => other.price !== item.price)" class="block text-xs text-zinc-600">{{ formatCurrency(item.price) }}</span>
              </button>
            </div>
          </div>

          <div class="flex flex-wrap items-end gap-3">
            <div>
              <p class="mb-2 text-sm font-semibold text-ortic-ink">{{ translate("features.catalog.detail.quantity") }}</p>
              <UInputNumber v-model="quantity" :min="1" :max="99" class="w-36" />
            </div>
            <UButton
              :label="translate('features.catalog.detail.add_to_cart')"
              icon="i-lucide-shopping-cart"
              color="secondary"
              size="xl"
              class="btn-comic flex-1 justify-center text-ortic-ink sm:flex-none"
              :disabled="!variant"
              @click="addToCart"
            />
          </div>

          <div class="space-y-2 rounded-xl border-2 border-ortic-ink bg-white p-4 text-sm">
            <p class="flex gap-2 text-toned"><UIcon name="i-lucide-truck" class="mt-0.5 size-4 shrink-0 text-ortic-blue" />{{ translate("features.catalog.detail.shipping_note") }}</p>
            <p v-if="product.is_hazardous" class="flex gap-2 text-toned">
              <UIcon name="i-lucide-flask-conical" class="mt-0.5 size-4 shrink-0 text-ortic-red" />{{ translate("features.catalog.detail.hazardous") }}
            </p>
            <dl v-if="variant" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pt-1 text-muted">
              <dt>{{ translate("features.catalog.detail.sku") }}</dt>
              <dd class="text-toned">{{ variant.sku }}</dd>
              <dt>{{ translate("features.catalog.detail.weight") }}</dt>
              <dd class="text-toned">{{ formatNumber(variant.weight_gram) }} g</dd>
              <template v-if="product.permit_number">
                <dt>{{ translate("features.catalog.detail.permit") }}</dt>
                <dd class="text-toned">{{ product.permit_number }}</dd>
              </template>
            </dl>
          </div>
        </div>
      </div>

      <div class="mt-10 grid gap-8 md:grid-cols-2">
        <div v-if="product.description">
          <h2 class="font-display text-3xl tracking-wide text-ortic-ink">{{ translate("features.catalog.detail.description") }}</h2>
          <p class="mt-2 whitespace-pre-line text-toned">{{ product.description }}</p>
        </div>
        <div v-if="specs.length">
          <h2 class="font-display text-3xl tracking-wide text-ortic-ink">{{ translate("features.catalog.detail.specifications") }}</h2>
          <dl class="mt-2 divide-y divide-ortic-ink/15 overflow-hidden rounded-xl border-2 border-ortic-ink bg-white">
            <div v-for="[name, value] in specs" :key="name" class="grid grid-cols-[40%_1fr] gap-3 px-4 py-2 text-sm">
              <dt class="font-semibold text-ortic-ink">{{ name }}</dt>
              <dd class="text-toned">{{ value }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </template>
  </section>
</template>
