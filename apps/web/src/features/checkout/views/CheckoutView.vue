<script setup lang="ts">
import { useOverlay } from "@nuxt/ui/composables"
import { keepPreviousData, useMutation, useQuery } from "@tanstack/vue-query"
import { storeToRefs } from "pinia"
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"

import { useCartStore } from "@/features/cart/stores/cart.store"
import { CatalogPageName } from "@/features/catalog/models"
import { LegalPageName } from "@/features/legal/models"
import { OrdersPageName } from "@/features/orders/models"
import { translate } from "@/plugins/language"
import { useAppToast } from "@/plugins/nuxt-ui/toaster"
import QueryErrorAlert from "@/shared/components/QueryErrorAlert.vue"
import { getApiErrorMessage, getApiFieldErrors } from "@/shared/helpers/error"
import { formatCurrency, formatNumber } from "@/shared/helpers/number"

import AddressFormModal from "../components/AddressFormModal.vue"
import type { Address, ShippingOption } from "../models"
import { checkoutQueryKeys, getAddresses, getCheckoutQuote, placeOrder } from "../services/api"

/**
 * Checkout: shipping address, items re-priced by the API, courier choice from the origin warehouse, totals, and
 * "Pay with QRIS" which creates the order and opens its payment page.
 */
const router = useRouter()
const cart = useCartStore()
// Lines the API says are no longer sold / out of stock stay in the cart page, not here.
const { availableItems: cartItems } = storeToRefs(cart)
const { showToast } = useAppToast()
const addressModal = useOverlay().create(AddressFormModal)

const lineItems = computed(() => cartItems.value.map((item) => ({ variant_id: item.variant_id, quantity: item.quantity })))

// Addresses: the primary one is chosen first.
const addressesQuery = useQuery({
  queryKey: checkoutQueryKeys.addresses,
  queryFn: getAddresses,
  select: (response) => response.data ?? [],
})
const addresses = computed(() => addressesQuery.data.value ?? [])
const addressId = ref<number>()
const choosingAddress = ref(false)
watch(
  addresses,
  (list) => {
    if (!list.some((item) => item.id === addressId.value)) addressId.value = (list.find((item) => item.is_default) ?? list[0])?.id
  },
  { immediate: true },
)
const address = computed(() => addresses.value.find((item) => item.id === addressId.value))

const openAddressForm = async (existing?: Address) => {
  const saved = (await addressModal.open({ address: existing })) as Address | undefined
  if (saved) {
    addressId.value = saved.id
    choosingAddress.value = false
  }
}

// Quote: re-priced cart + shipping options; refreshed when the address, cart, or insurance choice changes.
const insure = ref(false)
const quoteQuery = useQuery({
  queryKey: computed(() => checkoutQueryKeys.quote(addressId.value ?? 0, lineItems.value, insure.value)),
  queryFn: () => getCheckoutQuote(addressId.value!, lineItems.value, insure.value),
  enabled: computed(() => addressId.value !== undefined && lineItems.value.length > 0),
  select: (response) => response.data!,
  placeholderData: keepPreviousData,
  retry: false,
})
const quote = computed(() => quoteQuery.data.value)
type StockFieldError = { field: string; message: string; available?: number }
const quoteErrors = computed(() => getApiFieldErrors(quoteQuery.error.value) as StockFieldError[])
const unavailableItems = computed(() => quoteErrors.value.filter((error) => error.field.startsWith("items.")))
// Items are in stock, but not all in one warehouse: the buyer splits the order.
const splitWarehouses = computed(() => quoteErrors.value.some((error) => error.field === "items"))
const itemError = (index: number) => {
  const error = unavailableItems.value.find((item) => item.field === `items.${index}`)
  if (!error) return null
  if (error.available === undefined) return translate("features.checkout.items.not_sold")
  return error.available > 0 ? translate("features.checkout.items.only_left", { count: error.available }) : translate("features.checkout.items.out_of_stock")
}
const fixQuantity = async (variantId: number, index: number) => {
  const error = unavailableItems.value.find((item) => item.field === `items.${index}`)
  if (error?.available) await cart.setQuantity(variantId, error.available)
  else await cart.remove(variantId)
}
const agreed = ref(false)

const optionKey = (option: ShippingOption) => `${option.courier_code}:${option.service_code}`
const selectedKey = ref<string>()
watch(quote, (value) => {
  if (!value) return
  if (!value.options.some((option) => optionKey(option) === selectedKey.value)) selectedKey.value = value.options[0] ? optionKey(value.options[0]) : undefined
})
const selected = computed(() => quote.value?.options.find((option) => optionKey(option) === selectedKey.value))

const total = computed(() => (quote.value && selected.value ? quote.value.items_total + selected.value.price + quote.value.service_fee : undefined))
const itemCount = computed(() => quote.value?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0)
const durationLabel = (option: ShippingOption) =>
  translate("features.checkout.shipping.days", {
    range: option.duration.replace(/\s*days?$/i, "").replace(/\s*-\s*/, "–"),
  })

const { mutate: pay, isPending: isPaying } = useMutation({
  mutationFn: () =>
    placeOrder({
      address_id: addressId.value!,
      items: lineItems.value,
      insure: insure.value,
      warehouse_id: quote.value?.origin.id,
      courier_code: selected.value!.courier_code,
      service_code: selected.value!.service_code,
    }),
  onSuccess: (response) => {
    const order = response.data!
    // Items now belong to the order (the API already removed them from the server cart); leave anything added meanwhile.
    void cart.refresh().catch(() => undefined)
    router.replace({ name: OrdersPageName.ORDER, params: { code: order.code } })
  },
  onError: (error) => {
    showToast.error({
      title: translate("features.checkout.summary.error"),
      description: getApiErrorMessage(error),
    })
    quoteQuery.refetch()
  },
})

const canPay = computed(() =>
  Boolean(
    address.value &&
    selected.value &&
    quote.value &&
    agreed.value &&
    !quoteQuery.isFetching.value &&
    unavailableItems.value.length === 0 &&
    !splitWarehouses.value,
  ),
)
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-8">
    <h1 class="font-display text-4xl tracking-wide text-ortic-ink sm:text-5xl">
      {{ translate("features.checkout.title") }}
    </h1>

    <div v-if="cartItems.length === 0" class="mt-8 rounded-xl border-2 border-dashed border-ortic-ink/40 p-10 text-center">
      <UIcon name="i-lucide-shopping-cart" class="size-10 text-zinc-400" />
      <p class="mt-3 text-muted">{{ translate("features.checkout.empty") }}</p>
      <UButton :to="{ name: CatalogPageName.PRODUCTS }" :label="translate('features.checkout.shop')" color="secondary" class="btn-comic mt-4 text-ortic-ink" />
    </div>

    <div v-else class="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="min-w-0 space-y-6">
        <!-- Address -->
        <section class="rounded-xl border-2 border-ortic-ink bg-white p-4 sm:p-5">
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-display text-2xl tracking-wide text-ortic-ink">
              {{ translate("features.checkout.address.title") }}
            </h2>
            <UButton
              v-if="addresses.length && !choosingAddress"
              :label="translate('features.checkout.address.change')"
              color="neutral"
              variant="outline"
              size="sm"
              @click="choosingAddress = true"
            />
          </div>

          <USkeleton v-if="addressesQuery.isPending.value" class="mt-3 h-20 w-full" />
          <QueryErrorAlert
            v-else-if="addressesQuery.isError.value"
            class="mt-3"
            :title="translate('features.checkout.address.title')"
            :error="addressesQuery.error.value"
            @retry="addressesQuery.refetch()"
          />

          <div v-else-if="addresses.length === 0" class="mt-3 space-y-3">
            <p class="text-sm text-muted">{{ translate("features.checkout.address.empty") }}</p>
            <UButton
              :label="translate('features.checkout.address.add')"
              icon="i-lucide-plus"
              color="secondary"
              class="btn-comic text-ortic-ink"
              @click="openAddressForm()"
            />
          </div>

          <div v-else-if="choosingAddress" class="mt-3 space-y-2" role="radiogroup" :aria-label="translate('features.checkout.address.choose')">
            <div
              v-for="item in addresses"
              :key="item.id"
              class="flex items-start gap-3 rounded-lg border-2 p-3"
              :class="item.id === addressId ? 'border-ortic-ink bg-ortic-yellow/30' : 'border-ortic-ink/20'"
            >
              <button
                type="button"
                role="radio"
                :aria-checked="item.id === addressId"
                class="min-w-0 flex-1 cursor-pointer text-left"
                @click="((addressId = item.id), (choosingAddress = false))"
              >
                <p class="font-semibold text-ortic-ink">
                  {{ item.recipient_name }} · {{ item.phone }}
                  <span v-if="item.label" class="ms-1 text-xs font-medium text-muted">({{ item.label }})</span>
                </p>
                <p class="text-sm text-toned">
                  {{ item.address }}, {{ item.district }}, {{ item.city }}, {{ item.province }}
                  {{ item.postal_code }}
                </p>
              </button>
              <UButton :label="translate('features.checkout.address.edit')" color="neutral" variant="ghost" size="xs" @click="openAddressForm(item)" />
            </div>
            <UButton
              :label="translate('features.checkout.address.add')"
              icon="i-lucide-plus"
              color="neutral"
              variant="outline"
              size="sm"
              @click="openAddressForm()"
            />
          </div>

          <div v-else-if="address" class="mt-3">
            <p class="font-semibold text-ortic-ink">
              {{ address.recipient_name }} · {{ address.phone }}
              <UBadge
                v-if="address.is_default"
                :label="translate('features.checkout.address.primary')"
                color="secondary"
                variant="subtle"
                size="sm"
                class="ms-1"
              />
            </p>
            <p class="text-sm text-toned">
              {{ address.address }}, {{ address.district }}, {{ address.city }}, {{ address.province }} {{ address.postal_code }}
            </p>
            <p v-if="address.notes" class="text-sm text-muted">{{ address.notes }}</p>
          </div>
        </section>

        <!-- Items -->
        <section class="rounded-xl border-2 border-ortic-ink bg-white p-4 sm:p-5">
          <h2 class="font-display text-2xl tracking-wide text-ortic-ink">
            {{ translate("features.checkout.items.title") }}
          </h2>
          <UAlert
            v-if="unavailableItems.length"
            class="mt-3"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :description="translate('features.checkout.items.unavailable')"
          />
          <UAlert
            v-if="splitWarehouses"
            class="mt-3"
            color="warning"
            variant="subtle"
            icon="i-lucide-warehouse"
            :description="translate('features.checkout.items.split')"
          />
          <ul class="mt-3 divide-y divide-ortic-ink/10">
            <li v-for="(item, index) in cartItems" :key="item.variant_id" class="flex items-center gap-3 py-3">
              <div class="size-14 shrink-0 overflow-hidden rounded-lg border-2 border-ortic-ink/15 bg-ortic-50">
                <img v-if="item.image_url" :src="item.image_url" :alt="item.product_name" class="size-full object-contain p-1" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="line-clamp-1 font-semibold text-ortic-ink">{{ item.product_name }}</p>
                <p class="text-sm text-muted">
                  {{ [item.variant_name, `${item.quantity} × ${formatCurrency(quote?.items[index]?.price ?? item.price)}`].filter(Boolean).join(" · ") }}
                </p>
                <p v-if="itemError(index)" class="text-sm text-error">{{ itemError(index) }}</p>
              </div>
              <UButton
                v-if="itemError(index)"
                :icon="unavailableItems.find((error) => error.field === `items.${index}`)?.available ? 'i-lucide-wand-sparkles' : 'i-lucide-trash-2'"
                :label="unavailableItems.find((error) => error.field === `items.${index}`)?.available ? translate('features.checkout.items.fix') : undefined"
                color="error"
                variant="ghost"
                size="sm"
                @click="fixQuantity(item.variant_id, index)"
              />
              <UButton v-else-if="splitWarehouses" icon="i-lucide-trash-2" color="neutral" variant="ghost" size="sm" @click="cart.remove(item.variant_id)" />
              <p v-else class="shrink-0 font-semibold text-ortic-ink">
                {{ formatCurrency(quote?.items[index]?.subtotal ?? item.price * item.quantity) }}
              </p>
            </li>
          </ul>
        </section>

        <!-- Shipping -->
        <section v-if="address" class="rounded-xl border-2 border-ortic-ink bg-white p-4 sm:p-5">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="font-display text-2xl tracking-wide text-ortic-ink">
              {{ translate("features.checkout.shipping.title") }}
            </h2>
            <p v-if="quote" class="text-sm text-muted">
              {{ translate("features.checkout.shipping.from", { name: quote.origin.name }) }} · {{ formatNumber(quote.weight_gram / 1000, "id-ID", 2) }} kg
            </p>
          </div>

          <p v-if="quote?.is_mock_rates" class="mt-2 flex items-center gap-1.5 text-xs text-warning">
            <UIcon name="i-lucide-flask-conical" class="size-4" />{{ translate("features.checkout.shipping.mock") }}
          </p>

          <div v-if="quoteQuery.isPending.value" class="mt-3 space-y-2">
            <USkeleton v-for="n in 3" :key="n" class="h-14 w-full" />
          </div>
          <QueryErrorAlert
            v-else-if="quoteQuery.isError.value && !unavailableItems.length && !splitWarehouses"
            class="mt-3"
            :title="translate('features.checkout.shipping.error')"
            :error="quoteQuery.error.value"
            @retry="quoteQuery.refetch()"
          />
          <p v-else-if="quote && quote.options.length === 0" class="mt-3 text-sm text-muted">
            {{ translate("features.checkout.shipping.none") }}
          </p>

          <div
            v-else-if="quote"
            class="mt-3 space-y-2"
            role="radiogroup"
            :aria-label="translate('features.checkout.shipping.title')"
            :class="{ 'opacity-60': quoteQuery.isFetching.value }"
          >
            <button
              v-for="option in quote.options"
              :key="optionKey(option)"
              type="button"
              role="radio"
              :aria-checked="optionKey(option) === selectedKey"
              class="flex w-full cursor-pointer items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-colors"
              :class="optionKey(option) === selectedKey ? 'border-ortic-ink bg-ortic-yellow/30 shadow-comic' : 'border-ortic-ink/20 hover:border-ortic-ink'"
              @click="selectedKey = optionKey(option)"
            >
              <span class="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-ortic-ink">
                <span v-if="optionKey(option) === selectedKey" class="size-2.5 rounded-full bg-ortic-ink" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block font-semibold text-ortic-ink">{{ option.courier_name }} {{ option.service_name }}</span>
                <span class="block text-sm text-muted">{{ durationLabel(option) }}</span>
              </span>
              <span class="shrink-0 font-semibold text-ortic-ink">{{ formatCurrency(option.price) }}</span>
            </button>
          </div>

          <div v-if="quote" class="mt-4 border-t-2 border-ortic-ink/10 pt-3">
            <USwitch v-if="!quote.insurance_required" v-model="insure" :label="translate('features.checkout.shipping.insure')" />
            <p v-else class="flex items-center gap-1.5 text-sm text-muted">
              <UIcon name="i-lucide-shield-check" class="size-4 text-ortic-blue" />{{
                translate("features.checkout.shipping.insure_required", {
                  amount: formatCurrency(quote.insurance_threshold),
                })
              }}
            </p>
          </div>
        </section>
      </div>

      <!-- Summary -->
      <aside class="space-y-3 rounded-xl border-2 border-ortic-ink bg-white p-4 shadow-comic lg:sticky lg:top-20">
        <h2 class="font-display text-2xl tracking-wide text-ortic-ink">
          {{ translate("features.checkout.summary.title") }}
        </h2>
        <dl class="space-y-1.5 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="text-muted">
              {{ translate("features.checkout.summary.items", { count: itemCount || cart.count }) }}
            </dt>
            <dd>{{ formatCurrency(quote?.items_total ?? cart.subtotal) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">{{ translate("features.checkout.summary.shipping") }}</dt>
            <dd>{{ selected ? formatCurrency(selected.shipping_fee) : "–" }}</dd>
          </div>
          <div v-if="selected?.insurance_fee" class="flex justify-between gap-3">
            <dt class="text-muted">{{ translate("features.checkout.summary.insurance") }}</dt>
            <dd>{{ formatCurrency(selected.insurance_fee) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted">{{ translate("features.checkout.summary.service") }}</dt>
            <dd>{{ quote ? formatCurrency(quote.service_fee) : "–" }}</dd>
          </div>
        </dl>
        <div class="flex justify-between border-t-2 border-ortic-ink/10 pt-3 text-lg font-bold text-ortic-ink">
          <span>{{ translate("features.checkout.summary.total") }}</span>
          <span>{{ total !== undefined ? formatCurrency(total) : "–" }}</span>
        </div>
        <UCheckbox v-model="agreed" class="pt-1">
          <template #label>
            <span class="text-sm text-toned">
              {{ translate("features.checkout.summary.agree_prefix") }}
              <RouterLink :to="{ name: LegalPageName.TERMS }" target="_blank" class="font-semibold text-ortic-blue underline">{{
                translate("features.checkout.summary.terms")
              }}</RouterLink>
              {{ translate("features.checkout.summary.and") }}
              <RouterLink :to="{ name: LegalPageName.RETURNS }" target="_blank" class="font-semibold text-ortic-blue underline">{{
                translate("features.checkout.summary.returns")
              }}</RouterLink>
            </span>
          </template>
        </UCheckbox>
        <UButton
          :label="translate('features.checkout.summary.pay')"
          icon="i-lucide-qr-code"
          color="secondary"
          size="lg"
          block
          class="btn-comic text-ortic-ink"
          :loading="isPaying"
          :disabled="!canPay || isPaying"
          @click="pay()"
        />
        <p class="text-xs text-muted">
          {{
            !selected && quote
              ? translate("features.checkout.summary.choose_shipping")
              : !agreed
                ? translate("features.checkout.summary.agree_required")
                : translate("features.checkout.summary.note")
          }}
        </p>
      </aside>
    </div>
  </section>
</template>
