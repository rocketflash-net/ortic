import { useLocalStorage } from "@vueuse/core"
import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"

import { useAuthStore } from "@/features/authentication/stores/authentication.store"

import type { ServerCartLine } from "../models"
import { clearCart, getCart, mergeCart, setCartItem } from "../services/api"

/** One line in the cart: a product variant and how many. */
export type CartItem = {
  variant_id: number
  product_slug: string | null
  product_name: string
  /** Null for a product without variants. */
  variant_name: string | null
  sku: string | null
  price: number
  compare_at_price?: number | null
  image_url: string | null
  weight_gram: number
  quantity: number
  /** Stock limit (server cart, or from the product page for guests). Undefined = unknown. */
  max_quantity?: number
  /** False when the product is no longer sold or out of stock (server cart only). */
  is_available?: boolean
}

export const MAX_CART_QUANTITY = 99

const toItem = (line: ServerCartLine): CartItem => ({ ...line })

/**
 * Cart of the store.
 *
 * @remarks
 * Guests keep the cart in this browser. Signed-in buyers use the server cart (same on every device, prices and
 * stock re-read by the API); the guest cart is merged into it right after login, then emptied here.
 */
export const useCartStore = defineStore("cart", () => {
  const auth = useAuthStore()
  const localItems = useLocalStorage<CartItem[]>("ortic.web.cart", [])
  const serverItems = ref<CartItem[]>([])
  const isSyncing = ref(false)

  const isServer = computed(() => auth.isAuthenticated)
  const items = computed<CartItem[]>(() => (isServer.value ? serverItems.value : localItems.value))
  const availableItems = computed(() => items.value.filter((item) => item.is_available !== false))

  const count = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const subtotal = computed(() => availableItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0))
  const weightGram = computed(() => availableItems.value.reduce((sum, item) => sum + item.weight_gram * item.quantity, 0))

  const apply = (lines: ServerCartLine[] | null | undefined) => {
    serverItems.value = (lines ?? []).map(toItem)
  }

  /** Reloads the server cart (e.g. after checkout removed the ordered items). */
  const refresh = async () => {
    if (!isServer.value) return
    apply((await getCart()).data)
  }

  // Login: merge the guest cart, then use the server cart. Logout: forget the server copy.
  watch(
    isServer,
    async (signedIn) => {
      if (!signedIn) {
        serverItems.value = []
        return
      }
      isSyncing.value = true
      try {
        const guest = localItems.value.map((item) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
        }))
        apply((guest.length ? await mergeCart(guest) : await getCart()).data)
        localItems.value = []
      } catch {
        // Keep the guest cart in the browser; it is merged on the next attempt.
      } finally {
        isSyncing.value = false
      }
    },
    { immediate: true },
  )

  const limitOf = (item: Pick<CartItem, "max_quantity">) => Math.min(item.max_quantity ?? MAX_CART_QUANTITY, MAX_CART_QUANTITY)

  /** Adds to the cart; throws the API error when the item is out of stock (server cart). */
  const add = async (item: Omit<CartItem, "quantity">, quantity = 1) => {
    if (isServer.value) {
      const existing = serverItems.value.find((line) => line.variant_id === item.variant_id)
      apply((await setCartItem(item.variant_id, (existing?.quantity ?? 0) + quantity)).data)
      return
    }
    const existing = localItems.value.find((line) => line.variant_id === item.variant_id)
    if (existing) {
      // Refresh name/price/stock from the catalog and add to the quantity.
      Object.assign(existing, item, {
        quantity: Math.min(existing.quantity + quantity, limitOf(item)),
      })
    } else {
      localItems.value.push({ ...item, quantity: Math.min(quantity, limitOf(item)) })
    }
  }

  const setQuantity = async (variantId: number, quantity: number) => {
    if (isServer.value) {
      apply((await setCartItem(variantId, Math.max(1, quantity))).data)
      return
    }
    const line = localItems.value.find((item) => item.variant_id === variantId)
    if (line) line.quantity = Math.max(1, Math.min(quantity, limitOf(line)))
  }

  const remove = async (variantId: number) => {
    if (isServer.value) {
      apply((await setCartItem(variantId, 0)).data)
      return
    }
    localItems.value = localItems.value.filter((item) => item.variant_id !== variantId)
  }

  const clear = async () => {
    if (isServer.value) {
      apply((await clearCart()).data)
      return
    }
    localItems.value = []
  }

  return {
    items,
    availableItems,
    count,
    subtotal,
    weightGram,
    isSyncing,
    add,
    setQuantity,
    remove,
    clear,
    refresh,
    limitOf,
  }
})
