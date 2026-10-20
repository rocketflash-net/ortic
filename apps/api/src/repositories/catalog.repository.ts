import { and, asc, count, desc, eq, inArray, like, or, SQL, sql } from "drizzle-orm";
import Repository from "@base/repository.base";
import ProductStatusEnum from "@enums/product-status.enum";
import { brands } from "@models/brand.model";
import { categories } from "@models/category.model";
import { productVariants } from "@models/product-variant.model";
import { warehouseStocks } from "@models/warehouse-stock.model";
import { warehouses } from "@models/warehouse.model";
import { products } from "@models/product.model";
import { CategoryType, ProductType } from "@@types/entity.type";
import { PaginationOptionsType } from "@@types/pagination.type";
import { effectivePriceSql } from "@utils/price.util";

type CatalogSortType = "newest" | "price_asc" | "price_desc" | "name";

type CatalogFilterType = { search?: string; categoryId?: number };

type SellableVariantType = {
  variantId: number;
  productId: number;
  productName: string;
  productSlug: string;
  variantName: string | null;
  sku: string;
  price: number;
  salePrice: number | null;
  compareAtPrice: number | null;
  basePrice: number;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  weightGram: number;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
};

type CatalogListRowType = {
  product: ProductType;
  categoryName: string;
  categorySlug: string;
  brandName: string | null;
  minPrice: number;
  maxPrice: number;
  maxCompareAtPrice: number | null;
  variantCount: number;
  inStock: boolean;
};

// Produk yang tampil di toko: status Aktif dan punya minimal satu varian aktif.
const activeVariantExists = sql`exists (select 1 from ${productVariants} where ${productVariants.productId} = ${products.id} and ${productVariants.isActive} = true)`;

// Produk punya stok tersedia (quantity - reserved > 0) untuk varian aktif di gudang aktif yang siap kirim.
const inStockSql = sql<number>`exists (select 1 from ${warehouseStocks} ws
  inner join ${productVariants} sv on sv.id = ws.variant_id
  inner join ${warehouses} sw on sw.id = ws.warehouse_id
  where sv.product_id = ${products.id} and sv.is_active = true and sw.is_active = true and sw.biteship_area_id is not null
    and ws.quantity - ws.reserved > 0)`;

/**
 * Query katalog publik (toko). Hanya produk Aktif dengan varian aktif; harga dasar tidak pernah diambil.
 */
export default class CatalogRepository extends Repository {
  async findPublished(filter: CatalogFilterType, sort: CatalogSortType, { limit, offset }: PaginationOptionsType): Promise<CatalogListRowType[]> {
    const now = new Date();
    const price = effectivePriceSql(now);
    const minPrice = sql<number>`min(${price})`;
    const inStock = sql<number>`max(${inStockSql})`;
    const orderBy = {
      newest: [desc(inStock), desc(products.createdAt), desc(products.id)],
      price_asc: [desc(inStock), asc(minPrice), asc(products.id)],
      price_desc: [desc(inStock), desc(minPrice), asc(products.id)],
      name: [desc(inStock), asc(products.name), asc(products.id)],
    }[sort];

    const rows = await this.executor
      .select({
        product: products,
        categoryName: categories.name,
        categorySlug: categories.slug,
        brandName: brands.name,
        minPrice,
        maxPrice: sql<number>`max(${price})`,
        // Harga coret: harga normal selama promo, atau compare_at_price manual.
        maxCompareAtPrice: sql<
          number | null
        >`max(case when ${price} < ${productVariants.price} then ${productVariants.price} when ${productVariants.compareAtPrice} > ${productVariants.price} then ${productVariants.compareAtPrice} else null end)`,
        variantCount: count(productVariants.id),
        inStock,
      })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(brands, eq(brands.id, products.brandId))
      .innerJoin(productVariants, and(eq(productVariants.productId, products.id), eq(productVariants.isActive, true)))
      .where(this.publishedWhere(filter))
      .groupBy(products.id, categories.id, brands.id)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    return rows.map((row) => ({
      ...row,
      minPrice: Number(row.minPrice),
      maxPrice: Number(row.maxPrice),
      maxCompareAtPrice: row.maxCompareAtPrice === null ? null : Number(row.maxCompareAtPrice),
      inStock: Number(row.inStock) === 1,
    }));
  }

  async countPublished(filter: CatalogFilterType): Promise<number> {
    // Join merek karena pencarian juga mencocokkan nama merek.
    const [row] = await this.executor
      .select({ total: count() })
      .from(products)
      .leftJoin(brands, eq(brands.id, products.brandId))
      .where(and(this.publishedWhere(filter), activeVariantExists));
    return row?.total ?? 0;
  }

  async findPublishedBySlug(slug: string): Promise<ProductType | null> {
    const [product] = await this.executor
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), eq(products.status, ProductStatusEnum.active), activeVariantExists))
      .limit(1);
    return product ?? null;
  }

  // Varian yang masih dijual (varian aktif dari produk Aktif), untuk checkout. Varian lain tidak dikembalikan.
  async findSellableVariants(variantIds: number[]): Promise<SellableVariantType[]> {
    if (variantIds.length === 0) return [];
    return await this.executor
      .select({
        variantId: productVariants.id,
        productId: products.id,
        productName: products.name,
        productSlug: products.slug,
        variantName: productVariants.name,
        sku: productVariants.sku,
        price: productVariants.price,
        salePrice: productVariants.salePrice,
        compareAtPrice: productVariants.compareAtPrice,
        basePrice: productVariants.basePrice,
        saleStartsAt: products.saleStartsAt,
        saleEndsAt: products.saleEndsAt,
        weightGram: productVariants.weightGram,
        lengthCm: productVariants.lengthCm,
        widthCm: productVariants.widthCm,
        heightCm: productVariants.heightCm,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(and(inArray(productVariants.id, variantIds), eq(productVariants.isActive, true), eq(products.status, ProductStatusEnum.active)));
  }

  async findCategoryBySlug(slug: string): Promise<CategoryType | null> {
    const [category] = await this.executor
      .select()
      .from(categories)
      .where(and(eq(categories.slug, slug), eq(categories.isActive, true)))
      .limit(1);
    return category ?? null;
  }

  async findCategoryById(id: number): Promise<CategoryType | null> {
    const [category] = await this.executor.select().from(categories).where(eq(categories.id, id)).limit(1);
    return category ?? null;
  }

  async findBrandName(id: number | null): Promise<string | null> {
    if (id === null) return null;
    const [brand] = await this.executor.select({ name: brands.name }).from(brands).where(eq(brands.id, id)).limit(1);
    return brand?.name ?? null;
  }

  // Varian yang dijual, termurah dulu.
  async activeVariants(productId: number) {
    return await this.executor
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true)))
      .orderBy(asc(productVariants.price), asc(productVariants.id));
  }

  private publishedWhere({ search, categoryId }: CatalogFilterType): SQL | undefined {
    const conditions: (SQL | undefined)[] = [eq(products.status, ProductStatusEnum.active)];
    if (categoryId) conditions.push(eq(products.categoryId, categoryId));
    if (search) {
      const pattern = `%${search}%`;
      const skuMatch = sql`exists (select 1 from ${productVariants} v2 where v2.product_id = ${products.id} and v2.is_active = true and v2.sku like ${pattern})`;
      conditions.push(or(like(products.name, pattern), like(brands.name, pattern), skuMatch));
    }
    return and(...conditions);
  }
}

export { type CatalogSortType, type CatalogFilterType, type CatalogListRowType, type SellableVariantType };
