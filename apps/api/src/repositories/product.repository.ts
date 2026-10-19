import { and, asc, count, desc, eq, inArray, like, max, min, ne, notInArray, or, SQL, sql } from "drizzle-orm";
import Repository from "@base/repository.base";
import { brands } from "@models/brand.model";
import { categories } from "@models/category.model";
import { productImages } from "@models/product-image.model";
import { productVariants } from "@models/product-variant.model";
import { products } from "@models/product.model";
import { stockMovements } from "@models/stock-movement.model";
import { warehouseStocks } from "@models/warehouse-stock.model";
import {
  NewProductImageType,
  NewProductType,
  NewProductVariantType,
  ProductImageType,
  ProductType,
  ProductVariantType,
} from "@@types/entity.type";
import { PaginationOptionsType } from "@@types/pagination.type";
import { ProductFilterType } from "@validators/product.validator";

type ProductListRowType = ProductType & { categoryName: string; brandName: string | null };

type VariantSummaryType = { productId: number; variantCount: number; minPrice: number | null; maxPrice: number | null };

export default class ProductRepository extends Repository {
  async findAll(filter: ProductFilterType, { limit, offset }: PaginationOptionsType): Promise<ProductListRowType[]> {
    const rows = await this.executor
      .select({ product: products, categoryName: categories.name, brandName: brands.name })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(brands, eq(brands.id, products.brandId))
      .where(this.filterWhere(filter))
      .orderBy(desc(products.updatedAt), desc(products.id))
      .limit(limit)
      .offset(offset);
    return rows.map((row) => ({ ...row.product, categoryName: row.categoryName, brandName: row.brandName }));
  }

  async count(filter: ProductFilterType): Promise<number> {
    const [row] = await this.executor.select({ total: count() }).from(products).where(this.filterWhere(filter));
    return row?.total ?? 0;
  }

  async findById(id: number): Promise<ProductType | null> {
    const [product] = await this.executor.select().from(products).where(eq(products.id, id)).limit(1);
    return product ?? null;
  }

  async slugExists(slug: string, exceptId?: number): Promise<boolean> {
    const where = exceptId ? and(eq(products.slug, slug), ne(products.id, exceptId)) : eq(products.slug, slug);
    const [row] = await this.executor.select({ id: products.id }).from(products).where(where).limit(1);
    return Boolean(row);
  }

  // Slug yang sudah dipakai dan diawali `base` (untuk mencari akhiran -2, -3, ...).
  async slugsStartingWith(base: string, exceptId?: number): Promise<string[]> {
    const where = and(like(products.slug, `${base}%`), exceptId ? ne(products.id, exceptId) : undefined);
    const rows = await this.executor.select({ slug: products.slug }).from(products).where(where);
    return rows.map((row) => row.slug);
  }

  async store(data: NewProductType): Promise<number> {
    const [result] = await this.executor.insert(products).values(data).$returningId();
    return result!.id;
  }

  async update(id: number, data: Partial<NewProductType>): Promise<void> {
    await this.executor.update(products).set(data).where(eq(products.id, id));
  }

  // ----- Varian -----

  async findVariants(productId: number): Promise<ProductVariantType[]> {
    return await this.executor.select().from(productVariants).where(eq(productVariants.productId, productId)).orderBy(asc(productVariants.id));
  }

  async variantSummaries(productIds: number[]): Promise<VariantSummaryType[]> {
    if (productIds.length === 0) return [];
    const rows = await this.executor
      .select({
        productId: productVariants.productId,
        variantCount: count(),
        minPrice: min(productVariants.price),
        maxPrice: max(productVariants.price),
      })
      .from(productVariants)
      .where(and(inArray(productVariants.productId, productIds), eq(productVariants.isActive, true)))
      .groupBy(productVariants.productId);
    return rows.map((row) => ({ ...row, minPrice: row.minPrice === null ? null : Number(row.minPrice), maxPrice: row.maxPrice === null ? null : Number(row.maxPrice) }));
  }

  // SKU yang sudah dipakai varian lain (di luar `exceptVariantIds`).
  async takenSkus(skus: string[], exceptVariantIds: number[]): Promise<string[]> {
    if (skus.length === 0) return [];
    const where = and(inArray(productVariants.sku, skus), exceptVariantIds.length ? notInArray(productVariants.id, exceptVariantIds) : undefined);
    const rows = await this.executor.select({ sku: productVariants.sku }).from(productVariants).where(where);
    return rows.map((row) => row.sku);
  }

  async storeVariant(data: NewProductVariantType): Promise<number> {
    const [result] = await this.executor.insert(productVariants).values(data).$returningId();
    return result!.id;
  }

  async updateVariant(id: number, data: Partial<NewProductVariantType>): Promise<void> {
    await this.executor.update(productVariants).set(data).where(eq(productVariants.id, id));
  }

  async deleteVariants(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.executor.delete(productVariants).where(inArray(productVariants.id, ids));
  }

  // Varian yang sudah punya riwayat stok tidak boleh dihapus (riwayat ikut hilang), cukup dinonaktifkan.
  async variantIdsWithStockHistory(ids: number[]): Promise<number[]> {
    if (ids.length === 0) return [];
    const [stocked, moved] = await Promise.all([
      this.executor.selectDistinct({ id: warehouseStocks.variantId }).from(warehouseStocks).where(inArray(warehouseStocks.variantId, ids)),
      this.executor.selectDistinct({ id: stockMovements.variantId }).from(stockMovements).where(inArray(stockMovements.variantId, ids)),
    ]);
    return [...new Set([...stocked, ...moved].map((row) => row.id))];
  }

  // ----- Foto -----

  async findImages(productId: number): Promise<ProductImageType[]> {
    return await this.executor.select().from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.sortOrder), asc(productImages.id));
  }

  // Foto utama (urutan pertama) per produk.
  async primaryImages(productIds: number[]): Promise<Map<number, string>> {
    if (productIds.length === 0) return new Map();
    const rows = await this.executor
      .select({ productId: productImages.productId, url: productImages.url, sortOrder: productImages.sortOrder })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.sortOrder), asc(productImages.id));
    const result = new Map<number, string>();
    for (const row of rows) if (!result.has(row.productId)) result.set(row.productId, row.url);
    return result;
  }

  async replaceImages(productId: number, images: Omit<NewProductImageType, "productId">[]): Promise<void> {
    await this.executor.delete(productImages).where(eq(productImages.productId, productId));
    if (images.length) await this.executor.insert(productImages).values(images.map((image) => ({ ...image, productId })));
  }

  private filterWhere({ search, category_id, status }: ProductFilterType): SQL | undefined {
    const conditions: (SQL | undefined)[] = [];
    if (search) {
      const pattern = `%${search}%`;
      // Cari juga di SKU varian.
      const skuMatch = sql`exists (select 1 from ${productVariants} where ${productVariants.productId} = ${products.id} and ${productVariants.sku} like ${pattern})`;
      conditions.push(or(like(products.name, pattern), skuMatch));
    }
    if (category_id) conditions.push(eq(products.categoryId, category_id));
    if (status) conditions.push(eq(products.status, status));
    return and(...conditions);
  }
}

export { type ProductListRowType, type VariantSummaryType };
