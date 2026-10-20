import { z } from "zod";
import { PRODUCT_STATUSES } from "@enums/product-status.enum";
import { positiveId, searchQuerySchema } from "@validators/common.validator";
import { SLUG_PATTERN } from "@utils/slug.util";

const MAX_IMAGES = 8;
const MAX_VARIANTS = 50;

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value === "" ? null : value));

const money = () => z.number().int().min(0).max(1000000000);
const percent = () => z.number().min(0).max(1000);
const dimension = () => z.number().positive().max(10000).nullable().default(null);
// Waktu ISO 8601 dengan zona (mis. "2026-11-01T00:00:00+07:00") atau null.
const nullableDateTime = () =>
  z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value))
    .nullable()
    .default(null);

// Harga (base_price, markup_percent, price, price_locked, compare_at_price) hanya dipakai bila pengirim punya prices:manage;
// Staf mengirim `price` untuk varian baru saja (lihat ProductService.resolvePricing).
const variantSchema = z.object({
  // Diisi untuk varian yang sudah ada; varian lama yang tidak dikirim dihapus (atau dinonaktifkan bila sudah punya stok).
  id: positiveId().optional(),
  // Kosong = dibuat otomatis (ORT-XXXXXX).
  sku: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Za-z0-9._-]*$/, "sku may only contain letters, numbers, dot, dash and underscore")
    .toUpperCase()
    .default(""),
  name: nullableText(150).default(null),
  base_price: money().optional(),
  markup_percent: percent().nullable().optional(),
  price: money().optional(),
  price_locked: z.boolean().default(false),
  compare_at_price: money().nullable().optional(),
  // Harga promo selama periode promo produk; harus lebih murah dari harga jual.
  sale_price: money().nullable().optional(),
  weight_gram: z.number().int().min(1).max(500000),
  length_cm: dimension(),
  width_cm: dimension(),
  height_cm: dimension(),
  is_active: z.boolean().default(true),
});

// Simpan produk lengkap (buat baru atau ganti seluruh isinya): info, foto, dan varian.
const saveProductSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    // Kosong = dibuat dari nama.
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(220)
      .refine((value) => value === "" || SLUG_PATTERN.test(value), "slug may only contain lowercase letters, numbers and dashes")
      .default(""),
    category_id: positiveId(),
    brand_id: positiveId().nullable().default(null),
    description: nullableText(20000).default(null),
    specifications: z.record(z.string().trim().min(1).max(100), z.string().trim().max(500)).nullable().default(null),
    permit_number: nullableText(64).default(null),
    is_hazardous: z.boolean().default(false),
    markup_percent: percent().nullable().optional(),
    // Periode harga promo (sale_price varian). null = tanpa batas di sisi itu.
    sale_starts_at: nullableDateTime(),
    sale_ends_at: nullableDateTime(),
    status: z.enum(PRODUCT_STATUSES),
    // Urutan = urutan tampil; foto pertama jadi foto utama. storage_key dari POST /admin/products/images/presign.
    images: z
      .array(
        z.object({
          storage_key: z
            .string()
            .trim()
            .regex(/^products\/[A-Za-z0-9/_-]+\.(jpg|png|webp)$/, "invalid storage_key"),
        })
      )
      .max(MAX_IMAGES)
      .default([]),
    variants: z.array(variantSchema).min(1).max(MAX_VARIANTS),
  })
  .refine((input) => !input.sale_starts_at || !input.sale_ends_at || input.sale_ends_at > input.sale_starts_at, {
    path: ["sale_ends_at"],
    message: "sale_ends_at must be after sale_starts_at",
  });

// Impor CSV: isi file dikirim sebagai teks. dry_run = hanya validasi & pratinjau, tidak menyimpan.
const importProductsSchema = z.object({
  csv: z
    .string()
    .min(1)
    .max(5 * 1024 * 1024),
  dry_run: z.boolean().default(true),
});

const productStatusSchema = z.object({ status: z.enum(PRODUCT_STATUSES) });

const listProductQuerySchema = searchQuerySchema.extend({
  category_id: positiveId().optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
});

const presignProductImageSchema = z.object({
  content_type: z.string().trim().toLowerCase().max(100),
  // Byte; batas per tipe dicek di service.
  size: z.number().int().positive(),
});

const createBrandSchema = z.object({ name: z.string().trim().min(1).max(100) });

type SaveProductInputType = z.infer<typeof saveProductSchema>;
type ImportProductsInputType = z.infer<typeof importProductsSchema>;
type SaveVariantInputType = z.infer<typeof variantSchema>;
type ListProductQueryType = z.infer<typeof listProductQuerySchema>;
type ProductFilterType = Pick<ListProductQueryType, "search" | "category_id" | "status">;
type PresignProductImageInputType = z.infer<typeof presignProductImageSchema>;

export {
  MAX_IMAGES,
  saveProductSchema,
  productStatusSchema,
  listProductQuerySchema,
  presignProductImageSchema,
  createBrandSchema,
  importProductsSchema,
  type ImportProductsInputType,
  type SaveProductInputType,
  type SaveVariantInputType,
  type ListProductQueryType,
  type ProductFilterType,
  type PresignProductImageInputType,
};
