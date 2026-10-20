import { sql, SQL } from "drizzle-orm";
import { productVariants } from "@models/product-variant.model";
import { products } from "@models/product.model";

// Harga jual = harga dasar x (1 + markup%), dibulatkan ke atas ke kelipatan `rounding` (default Rp500).
// Contoh: 23.000 x 1,05 = 24.150 -> 24.500.
const sellingPrice = (basePrice: number, markupPercent: number, rounding: number): number => {
  // Dihitung dalam sen supaya 1,05 x 20.000 tidak menjadi 21.000,000000004 lalu naik ke kelipatan berikutnya.
  const raw = Math.round(basePrice * (100 + markupPercent)) / 100;
  const step = rounding > 0 ? rounding : 1;
  return Math.ceil(raw / step) * step;
};

// Markup yang berlaku: varian -> produk -> kategori -> global.
const effectiveMarkup = (
  variantMarkup: number | null | undefined,
  productMarkup: number | null | undefined,
  globalMarkup: number,
  categoryMarkup: number | null | undefined = null
): number => variantMarkup ?? productMarkup ?? categoryMarkup ?? globalMarkup;

type SalePeriodType = { saleStartsAt: Date | null; saleEndsAt: Date | null };
type SaleVariantType = { price: number; salePrice: number | null; compareAtPrice: number | null };

// Periode promo produk sedang berjalan. Batas NULL = terbuka di sisi itu.
const isSaleActive = (product: SalePeriodType, now: Date = new Date()): boolean =>
  (!product.saleStartsAt || product.saleStartsAt <= now) && (!product.saleEndsAt || product.saleEndsAt > now);

const hasActiveSale = (variant: SaleVariantType, product: SalePeriodType, now: Date = new Date()): boolean =>
  variant.salePrice !== null && variant.salePrice > 0 && variant.salePrice < variant.price && isSaleActive(product, now);

// Harga yang dibayar pembeli saat ini.
const effectivePrice = (variant: SaleVariantType, product: SalePeriodType, now: Date = new Date()): number =>
  hasActiveSale(variant, product, now) ? variant.salePrice! : variant.price;

// Harga coret yang ditampilkan: harga normal selama promo, atau compare_at_price manual bila lebih tinggi.
const displayCompareAtPrice = (variant: SaleVariantType, product: SalePeriodType, now: Date = new Date()): number | null => {
  if (hasActiveSale(variant, product, now)) return variant.price;
  return variant.compareAtPrice !== null && variant.compareAtPrice > variant.price ? variant.compareAtPrice : null;
};

// Versi SQL dari effectivePrice (untuk urutkan & harga terendah di katalog). `now` dikirim sebagai parameter supaya
// zona waktunya sama dengan cara kolom datetime ditulis.
const effectivePriceSql = (now: Date = new Date()): SQL<number> =>
  sql<number>`case when ${productVariants.salePrice} is not null and ${productVariants.salePrice} > 0 and ${productVariants.salePrice} < ${productVariants.price}
    and (${products.saleStartsAt} is null or ${products.saleStartsAt} <= ${now})
    and (${products.saleEndsAt} is null or ${products.saleEndsAt} > ${now})
    then ${productVariants.salePrice} else ${productVariants.price} end`;

export { sellingPrice, effectiveMarkup, isSaleActive, hasActiveSale, effectivePrice, displayCompareAtPrice, effectivePriceSql };
