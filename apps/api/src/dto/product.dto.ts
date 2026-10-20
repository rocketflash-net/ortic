import { ProductImageType, ProductType, ProductVariantType } from "@@types/entity.type";
import { ProductListRowType, VariantSummaryType } from "@repositories/product.repository";

// Harga dasar & markup hanya untuk Owner (prices:manage); untuk Staf field-nya tidak dikirim sama sekali.
type PriceVisibilityType = { canSeeCost: boolean };

type ProductListItemResponseType = {
  id: number;
  name: string;
  slug: string;
  status: string;
  category: { id: number; name: string };
  brand_name: string | null;
  image_url: string | null;
  // Hanya varian aktif.
  variant_count: number;
  price_min: number | null;
  price_max: number | null;
  updated_at: Date;
};

type ProductVariantResponseType = {
  id: number;
  sku: string;
  name: string | null;
  base_price?: number;
  markup_percent?: number | null;
  price: number;
  price_locked: boolean;
  compare_at_price: number | null;
  sale_price: number | null;
  weight_gram: number;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  is_active: boolean;
};

type ProductDetailResponseType = {
  id: number;
  name: string;
  slug: string;
  category_id: number;
  brand_id: number | null;
  description: string | null;
  specifications: Record<string, string> | null;
  permit_number: string | null;
  is_hazardous: boolean;
  markup_percent?: number | null;
  sale_starts_at: Date | null;
  sale_ends_at: Date | null;
  status: string;
  images: { id: number; storage_key: string; url: string }[];
  variants: ProductVariantResponseType[];
  created_at: Date;
  updated_at: Date;
};

export default class ProductDto {
  static listItem(row: ProductListRowType, summary: VariantSummaryType | undefined, imageUrl: string | undefined): ProductListItemResponseType {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      category: { id: row.categoryId, name: row.categoryName },
      brand_name: row.brandName,
      image_url: imageUrl ?? null,
      variant_count: summary?.variantCount ?? 0,
      price_min: summary?.minPrice ?? null,
      price_max: summary?.maxPrice ?? null,
      updated_at: row.updatedAt,
    };
  }

  static detail(
    product: ProductType,
    variants: ProductVariantType[],
    images: ProductImageType[],
    { canSeeCost }: PriceVisibilityType
  ): ProductDetailResponseType {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      category_id: product.categoryId,
      brand_id: product.brandId,
      description: product.description,
      specifications: product.specifications ?? null,
      permit_number: product.permitNumber,
      is_hazardous: product.isHazardous,
      ...(canSeeCost ? { markup_percent: product.markupPercent } : {}),
      sale_starts_at: product.saleStartsAt,
      sale_ends_at: product.saleEndsAt,
      status: product.status,
      images: images.map((image) => ({ id: image.id, storage_key: image.storageKey, url: image.url })),
      variants: variants.map((variant) => ProductDto.variant(variant, { canSeeCost })),
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }

  static variant(variant: ProductVariantType, { canSeeCost }: PriceVisibilityType): ProductVariantResponseType {
    return {
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      ...(canSeeCost ? { base_price: variant.basePrice, markup_percent: variant.markupPercent } : {}),
      price: variant.price,
      price_locked: variant.priceLocked,
      compare_at_price: variant.compareAtPrice,
      sale_price: variant.salePrice,
      weight_gram: variant.weightGram,
      length_cm: variant.lengthCm,
      width_cm: variant.widthCm,
      height_cm: variant.heightCm,
      is_active: variant.isActive,
    };
  }
}
