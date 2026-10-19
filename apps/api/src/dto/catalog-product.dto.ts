import { ProductImageType, ProductType, ProductVariantType } from "@@types/entity.type";
import { CatalogListRowType } from "@repositories/catalog.repository";

// Produk untuk toko. Tidak pernah memuat harga dasar atau markup.
type CatalogProductCardType = {
  id: number;
  name: string;
  slug: string;
  brand_name: string | null;
  category: { name: string; slug: string };
  image_url: string | null;
  price_min: number;
  price_max: number;
  // Harga coret tertinggi di antara varian; null bila tidak ada.
  compare_at_price: number | null;
  variant_count: number;
};

type CatalogVariantType = {
  id: number;
  sku: string;
  name: string | null;
  price: number;
  compare_at_price: number | null;
  weight_gram: number;
};

type CatalogProductDetailType = {
  id: number;
  name: string;
  slug: string;
  brand_name: string | null;
  category: { name: string; slug: string };
  description: string | null;
  specifications: Record<string, string> | null;
  permit_number: string | null;
  is_hazardous: boolean;
  images: { url: string }[];
  variants: CatalogVariantType[];
};

export default class CatalogProductDto {
  static card(row: CatalogListRowType, imageUrl: string | undefined): CatalogProductCardType {
    return {
      id: row.product.id,
      name: row.product.name,
      slug: row.product.slug,
      brand_name: row.brandName,
      category: { name: row.categoryName, slug: row.categorySlug },
      image_url: imageUrl ?? null,
      price_min: row.minPrice,
      price_max: row.maxPrice,
      compare_at_price: row.maxCompareAtPrice !== null && row.maxCompareAtPrice > row.minPrice ? row.maxCompareAtPrice : null,
      variant_count: row.variantCount,
    };
  }

  static detail(
    product: ProductType,
    category: { name: string; slug: string },
    brandName: string | null,
    images: ProductImageType[],
    variants: ProductVariantType[]
  ): CatalogProductDetailType {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      brand_name: brandName,
      category,
      description: product.description,
      specifications: product.specifications ?? null,
      permit_number: product.permitNumber,
      is_hazardous: product.isHazardous,
      images: images.map((image) => ({ url: image.url })),
      variants: variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        name: variant.name,
        price: variant.price,
        compare_at_price: variant.compareAtPrice !== null && variant.compareAtPrice > variant.price ? variant.compareAtPrice : null,
        weight_gram: variant.weightGram,
      })),
    };
  }
}
