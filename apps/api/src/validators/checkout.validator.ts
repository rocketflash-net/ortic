import { z } from "zod";
import { positiveId } from "@validators/common.validator";

const MAX_CART_LINES = 50;

// Isi keranjang dari browser. Harga & berat selalu diambil ulang dari database, bukan dari client.
const cartItemsSchema = z
  .array(z.object({ variant_id: positiveId(), quantity: z.number().int().min(1).max(99) }))
  .min(1)
  .max(MAX_CART_LINES)
  .refine((items) => new Set(items.map((item) => item.variant_id)).size === items.length, "Each variant may appear only once");

const checkoutQuoteSchema = z.object({
  address_id: positiveId(),
  items: cartItemsSchema,
  // Asuransi opsional; wajib otomatis di atas `insurance_required_above`.
  insure: z.boolean().default(false),
});

const placeOrderSchema = checkoutQuoteSchema.extend({
  // Gudang asal dari hasil quote; dipakai lagi bila stoknya masih cukup supaya pilihan kurir tetap sama.
  warehouse_id: positiveId().optional(),
  courier_code: z.string().trim().toLowerCase().min(1).max(32),
  service_code: z.string().trim().toLowerCase().min(1).max(32),
});

const orderCodeParamSchema = z.object({ code: z.string().trim().toUpperCase().min(5).max(32) });

// Keranjang server: ubah jumlah satu varian (0 = hapus) dan gabungkan keranjang tamu saat login.
const setCartItemSchema = z.object({ variant_id: positiveId(), quantity: z.number().int().min(0).max(99) });
const mergeCartSchema = z.object({
  items: z
    .array(z.object({ variant_id: positiveId(), quantity: z.number().int().min(1).max(99) }))
    .max(MAX_CART_LINES)
    .default([]),
});

type CartItemsInputType = z.infer<typeof cartItemsSchema>;
type SetCartItemInputType = z.infer<typeof setCartItemSchema>;
type MergeCartInputType = z.infer<typeof mergeCartSchema>;
type CheckoutQuoteInputType = z.infer<typeof checkoutQuoteSchema>;
type PlaceOrderInputType = z.infer<typeof placeOrderSchema>;

export {
  MAX_CART_LINES,
  checkoutQuoteSchema,
  placeOrderSchema,
  orderCodeParamSchema,
  setCartItemSchema,
  mergeCartSchema,
  type SetCartItemInputType,
  type MergeCartInputType,
  type CartItemsInputType,
  type CheckoutQuoteInputType,
  type PlaceOrderInputType,
};
