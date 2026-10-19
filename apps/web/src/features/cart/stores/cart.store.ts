import { useLocalStorage } from "@vueuse/core"
import { defineStore } from "pinia"
import { computed } from "vue"

/** One line in the cart: a product variant and how many. Price is the catalog price when it was added. */
export type CartItem = {
  variant_id: number
  product_slug: string
  product_name: string
  /** Null for a product without variants. */
  variant_name: string | null
  sku: string
  price: number
  image_url: string | null
  weight_gram: number
  quantity: number
}

export const MAX_CART_QUANTITY = 99

/**
 * Cart kept in this browser (works for guests).
 *
 * @remarks
 * Fase 2 moves the cart to the API (limited by stock) and re-prices it at checkout; until then it only remembers
 * what the buyer picked.
 */
export const useCartStore = defineStore("cart", () => {
  const items = useLocalStorage<CartItem[]>("ortic.web.cart", [])

  const count = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const subtotal = computed(() => items.value.reduce((sum, item) => sum + item.price * item.quantity, 0))
  const weightGram = computed(() => items.value.reduce((sum, item) => sum + item.weight_gram * item.quantity, 0))

  const add = (item: Omit<CartItem, "quantity">, quantity = 1) => {
    const existing = items.value.find((line) => line.variant_id === item.variant_id)
    if (existing) {
      // Refresh name/price from the catalog and add to the quantity.
      Object.assign(existing, item, { quantity: Math.min(existing.quantity + quantity, MAX_CART_QUANTITY) })
    } else {
      items.value.push({ ...item, quantity: Math.min(quantity, MAX_CART_QUANTITY) })
    }
  }

  const setQuantity = (variantId: number, quantity: number) => {
    const line = items.value.find((item) => item.variant_id === variantId)
    if (line) line.quantity = Math.max(1, Math.min(quantity, MAX_CART_QUANTITY))
  }

  const remove = (variantId: number) => {
    items.value = items.value.filter((item) => item.variant_id !== variantId)
  }

  const clear = () => {
    items.value = []
  }

  return { items, count, subtotal, weightGram, add, setQuantity, remove, clear }
})
