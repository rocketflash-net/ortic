import { and, asc, count, desc, eq, gt, inArray, like, or, SQL, sql } from "drizzle-orm";
import Repository from "@base/repository.base";
import ProductStatusEnum from "@enums/product-status.enum";
import { productVariants } from "@models/product-variant.model";
import { products } from "@models/product.model";
import { stockMovements } from "@models/stock-movement.model";
import { users } from "@models/user.model";
import { warehouseStocks } from "@models/warehouse-stock.model";
import { warehouses } from "@models/warehouse.model";
import { NewStockMovementType, StockMovementType, WarehouseStockType } from "@@types/entity.type";
import { PaginationOptionsType } from "@@types/pagination.type";

type StockLevelFilterType = "all" | "low" | "out";

type StockListFilterType = { warehouseId: number; search?: string; level: StockLevelFilterType; categoryId?: number };

type StockListRowType = {
  variantId: number;
  productId: number;
  productName: string;
  productStatus: string;
  variantName: string | null;
  sku: string;
  variantActive: boolean;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
  basePrice: number;
};

type MovementRowType = { movement: StockMovementType; warehouseCode: string; actorName: string | null };

type StockValuationType = { warehouseId: number; units: number; value: number; skuCount: number; lowCount: number; outCount: number };

// Stok yang belum pernah diisi dianggap 0 dengan batas stok menipis default 5.
const DEFAULT_THRESHOLD = 5;

export default class StockRepository extends Repository {
  // Varian (semua produk kecuali diarsipkan) beserta stoknya di satu gudang.
  async findLevels(filter: StockListFilterType, { limit, offset }: PaginationOptionsType): Promise<StockListRowType[]> {
    const rows = await this.executor
      .select({
        variantId: productVariants.id,
        productId: products.id,
        productName: products.name,
        productStatus: products.status,
        variantName: productVariants.name,
        sku: productVariants.sku,
        variantActive: productVariants.isActive,
        basePrice: productVariants.basePrice,
        quantity: sql<number>`coalesce(${warehouseStocks.quantity}, 0)`,
        reserved: sql<number>`coalesce(${warehouseStocks.reserved}, 0)`,
        lowStockThreshold: sql<number>`coalesce(${warehouseStocks.lowStockThreshold}, ${DEFAULT_THRESHOLD})`,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .leftJoin(warehouseStocks, and(eq(warehouseStocks.variantId, productVariants.id), eq(warehouseStocks.warehouseId, filter.warehouseId)))
      .where(this.levelWhere(filter))
      .orderBy(asc(products.name), asc(productVariants.id))
      .limit(limit)
      .offset(offset);
    return rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      reserved: Number(row.reserved),
      lowStockThreshold: Number(row.lowStockThreshold),
    }));
  }

  async countLevels(filter: StockListFilterType): Promise<number> {
    const [row] = await this.executor
      .select({ total: count() })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .leftJoin(warehouseStocks, and(eq(warehouseStocks.variantId, productVariants.id), eq(warehouseStocks.warehouseId, filter.warehouseId)))
      .where(this.levelWhere(filter));
    return row?.total ?? 0;
  }

  // Baris stok yang ada untuk varian-varian ini (semua gudang).
  async findByVariants(variantIds: number[]): Promise<WarehouseStockType[]> {
    if (variantIds.length === 0) return [];
    return await this.executor.select().from(warehouseStocks).where(inArray(warehouseStocks.variantId, variantIds));
  }

  // Pastikan baris stok ada (quantity 0) supaya bisa dikunci dengan SELECT ... FOR UPDATE.
  async ensureRows(warehouseId: number, variantIds: number[]): Promise<void> {
    if (variantIds.length === 0) return;
    await this.executor
      .insert(warehouseStocks)
      .values(variantIds.map((variantId) => ({ warehouseId, variantId })))
      .onDuplicateKeyUpdate({ set: { warehouseId: sql`${warehouseStocks.warehouseId}` } });
  }

  // Kunci baris stok selama transaction (urut variant_id supaya dua transaction tidak saling menunggu / deadlock).
  async lockRows(warehouseId: number, variantIds: number[]): Promise<Map<number, WarehouseStockType>> {
    if (variantIds.length === 0) return new Map();
    const rows = await this.executor
      .select()
      .from(warehouseStocks)
      .where(and(eq(warehouseStocks.warehouseId, warehouseId), inArray(warehouseStocks.variantId, variantIds)))
      .orderBy(asc(warehouseStocks.variantId))
      .for("update");
    return new Map(rows.map((row) => [row.variantId, row]));
  }

  async updateRow(id: number, data: Partial<Pick<WarehouseStockType, "quantity" | "reserved" | "lowStockThreshold">>): Promise<void> {
    await this.executor.update(warehouseStocks).set(data).where(eq(warehouseStocks.id, id));
  }

  async storeMovements(movements: NewStockMovementType[]): Promise<void> {
    if (movements.length) await this.executor.insert(stockMovements).values(movements);
  }

  // Kartu stok satu varian (opsional satu gudang), terbaru dulu.
  async findMovements(variantId: number, warehouseId: number | undefined, { limit, offset }: PaginationOptionsType): Promise<MovementRowType[]> {
    return await this.executor
      .select({ movement: stockMovements, warehouseCode: warehouses.code, actorName: users.name })
      .from(stockMovements)
      .innerJoin(warehouses, eq(warehouses.id, stockMovements.warehouseId))
      .leftJoin(users, eq(users.id, stockMovements.actorUserId))
      .where(this.movementWhere(variantId, warehouseId))
      .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
      .limit(limit)
      .offset(offset);
  }

  async countMovements(variantId: number, warehouseId: number | undefined): Promise<number> {
    const [row] = await this.executor.select({ total: count() }).from(stockMovements).where(this.movementWhere(variantId, warehouseId));
    return row?.total ?? 0;
  }

  // Ringkasan stok per gudang (laporan stok): unit, nilai harga dasar, jumlah SKU menipis/habis. Hanya produk aktif.
  async valuation(): Promise<StockValuationType[]> {
    const available = sql`${warehouseStocks.quantity} - ${warehouseStocks.reserved}`;
    const rows = await this.executor
      .select({
        warehouseId: warehouseStocks.warehouseId,
        units: sql<number>`coalesce(sum(${warehouseStocks.quantity}), 0)`,
        value: sql<number>`coalesce(sum(${warehouseStocks.quantity} * ${productVariants.basePrice}), 0)`,
        skuCount: sql<number>`coalesce(sum(case when ${warehouseStocks.quantity} > 0 then 1 else 0 end), 0)`,
        lowCount: sql<number>`coalesce(sum(case when ${available} > 0 and ${available} <= ${warehouseStocks.lowStockThreshold} then 1 else 0 end), 0)`,
        outCount: sql<number>`coalesce(sum(case when ${available} <= 0 then 1 else 0 end), 0)`,
      })
      .from(warehouseStocks)
      .innerJoin(productVariants, eq(productVariants.id, warehouseStocks.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(and(eq(productVariants.isActive, true), eq(products.status, ProductStatusEnum.active)))
      .groupBy(warehouseStocks.warehouseId);
    return rows.map((row) => ({
      warehouseId: row.warehouseId,
      units: Number(row.units),
      value: Number(row.value),
      skuCount: Number(row.skuCount),
      lowCount: Number(row.lowCount),
      outCount: Number(row.outCount),
    }));
  }

  // Jumlah baris stok produk aktif yang menipis atau habis (kartu dashboard).
  async countLow(warehouseId?: number | null): Promise<number> {
    const available = sql`${warehouseStocks.quantity} - ${warehouseStocks.reserved}`;
    const [row] = await this.executor
      .select({ total: count() })
      .from(warehouseStocks)
      .innerJoin(productVariants, eq(productVariants.id, warehouseStocks.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          eq(productVariants.isActive, true),
          eq(products.status, ProductStatusEnum.active),
          sql`${available} <= ${warehouseStocks.lowStockThreshold}`,
          warehouseId ? eq(warehouseStocks.warehouseId, warehouseId) : undefined
        )
      );
    return row?.total ?? 0;
  }

  // Stok tersedia (quantity - reserved) per varian per gudang, hanya gudang yang diminta.
  async availability(variantIds: number[], warehouseIds: number[]): Promise<Map<number, Map<number, number>>> {
    const result = new Map<number, Map<number, number>>();
    if (variantIds.length === 0 || warehouseIds.length === 0) return result;
    const rows = await this.executor
      .select({
        variantId: warehouseStocks.variantId,
        warehouseId: warehouseStocks.warehouseId,
        quantity: warehouseStocks.quantity,
        reserved: warehouseStocks.reserved,
      })
      .from(warehouseStocks)
      .where(and(inArray(warehouseStocks.variantId, variantIds), inArray(warehouseStocks.warehouseId, warehouseIds), gt(warehouseStocks.quantity, 0)));
    for (const row of rows) {
      const byWarehouse = result.get(row.variantId) ?? new Map<number, number>();
      byWarehouse.set(row.warehouseId, Math.max(row.quantity - row.reserved, 0));
      result.set(row.variantId, byWarehouse);
    }
    return result;
  }

  private levelWhere({ search, level, categoryId }: StockListFilterType): SQL | undefined {
    const available = sql`coalesce(${warehouseStocks.quantity}, 0) - coalesce(${warehouseStocks.reserved}, 0)`;
    const threshold = sql`coalesce(${warehouseStocks.lowStockThreshold}, ${DEFAULT_THRESHOLD})`;
    const conditions: (SQL | undefined)[] = [sql`${products.status} <> ${ProductStatusEnum.archived}`];
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(or(like(products.name, pattern), like(productVariants.sku, pattern), like(productVariants.name, pattern)));
    }
    if (categoryId) conditions.push(eq(products.categoryId, categoryId));
    if (level === "low") conditions.push(sql`${available} > 0 and ${available} <= ${threshold}`);
    if (level === "out") conditions.push(sql`${available} <= 0`);
    return and(...conditions);
  }

  private movementWhere(variantId: number, warehouseId: number | undefined): SQL | undefined {
    return and(eq(stockMovements.variantId, variantId), warehouseId ? eq(stockMovements.warehouseId, warehouseId) : undefined);
  }
}

export { DEFAULT_THRESHOLD, type StockLevelFilterType, type StockListFilterType, type StockListRowType, type MovementRowType, type StockValuationType };
