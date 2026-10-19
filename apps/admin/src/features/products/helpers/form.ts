import type { ProductDetail, ProductPayload, ProductStatus } from "../models"

/** Editable variant. `key` identifies the row in the list (new rows have no `id` yet). */
export type VariantForm = {
  key: string
  id?: number
  sku: string
  name: string
  base_price?: number
  markup_percent?: number
  price?: number
  price_locked: boolean
  compare_at_price?: number
  weight_gram?: number
  length_cm?: number
  width_cm?: number
  height_cm?: number
  is_active: boolean
}

export type ImageForm = { storage_key: string; url: string }

export type SpecForm = { key: string; name: string; value: string }

export type ProductForm = {
  name: string
  slug: string
  category_id?: number
  brand_id?: number
  description: string
  specs: SpecForm[]
  permit_number: string
  is_hazardous: boolean
  markup_percent?: number
  status: ProductStatus
  images: ImageForm[]
  variants: VariantForm[]
}

let rowSeed = 0
/** Stable key for a new list row. */
export const rowKey = (): string => `row-${++rowSeed}`

export const emptyVariant = (): VariantForm => ({ key: rowKey(), sku: "", name: "", price_locked: false, is_active: true })

export const emptyProductForm = (): ProductForm => ({
  name: "",
  slug: "",
  description: "",
  specs: [],
  permit_number: "",
  is_hazardous: false,
  status: "draft",
  images: [],
  variants: [emptyVariant()],
})

const orUndefined = <T>(value: T | null | undefined): T | undefined => value ?? undefined

export const toProductForm = (product: ProductDetail): ProductForm => ({
  name: product.name,
  slug: product.slug,
  category_id: product.category_id,
  brand_id: orUndefined(product.brand_id),
  description: product.description ?? "",
  specs: Object.entries(product.specifications ?? {}).map(([name, value]) => ({ key: rowKey(), name, value })),
  permit_number: product.permit_number ?? "",
  is_hazardous: product.is_hazardous,
  markup_percent: orUndefined(product.markup_percent),
  status: product.status,
  images: product.images.map((image) => ({ storage_key: image.storage_key, url: image.url })),
  variants: product.variants.map((variant) => ({
    key: rowKey(),
    id: variant.id,
    sku: variant.sku,
    name: variant.name ?? "",
    base_price: orUndefined(variant.base_price),
    markup_percent: orUndefined(variant.markup_percent),
    price: variant.price,
    price_locked: variant.price_locked,
    compare_at_price: orUndefined(variant.compare_at_price),
    weight_gram: variant.weight_gram,
    length_cm: orUndefined(variant.length_cm),
    width_cm: orUndefined(variant.width_cm),
    height_cm: orUndefined(variant.height_cm),
    is_active: variant.is_active,
  })),
})

const blankToNull = (value: string): string | null => (value.trim() === "" ? null : value.trim())

/**
 * Request body for saving the form.
 *
 * @param canManagePrices - Owner: sends base price, markups, and lock. Staff: sends only the price of new variants,
 *   because the API keeps the prices of existing ones.
 */
export const toProductPayload = (form: ProductForm, canManagePrices: boolean): ProductPayload => {
  const specs = form.specs.filter((spec) => spec.name.trim() !== "")
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    category_id: form.category_id!,
    brand_id: form.brand_id ?? null,
    description: blankToNull(form.description),
    specifications: specs.length ? Object.fromEntries(specs.map((spec) => [spec.name.trim(), spec.value.trim()])) : null,
    permit_number: blankToNull(form.permit_number),
    is_hazardous: form.is_hazardous,
    ...(canManagePrices ? { markup_percent: form.markup_percent ?? null } : {}),
    status: form.status,
    images: form.images.map((image) => ({ storage_key: image.storage_key })),
    variants: form.variants.map((variant) => ({
      ...(variant.id !== undefined ? { id: variant.id } : {}),
      sku: variant.sku.trim(),
      name: blankToNull(variant.name),
      ...(canManagePrices
        ? {
            // Number inputs emit null when cleared.
            base_price: variant.base_price ?? undefined,
            markup_percent: variant.markup_percent ?? null,
            price: variant.price_locked ? (variant.price ?? undefined) : undefined,
            compare_at_price: variant.compare_at_price ?? null,
          }
        : variant.id === undefined
          ? { price: variant.price ?? undefined }
          : {}),
      price_locked: canManagePrices ? variant.price_locked : variant.id === undefined,
      weight_gram: variant.weight_gram ?? 0,
      length_cm: variant.length_cm ?? null,
      width_cm: variant.width_cm ?? null,
      height_cm: variant.height_cm ?? null,
      is_active: variant.is_active,
    })),
  }
}

/** Comparable snapshot for dirty checks (ignores row keys). */
export const formSnapshot = (form: ProductForm): string =>
  JSON.stringify({
    ...form,
    specs: form.specs.map(({ name, value }) => [name, value]),
    variants: form.variants.map(({ key: _key, ...variant }) => variant),
  })
