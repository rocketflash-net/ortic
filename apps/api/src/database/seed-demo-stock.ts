import "../paths";
import { and, eq, sql } from "drizzle-orm";
import { db, closeDatabaseConnection } from "@config/database.config";
import ProductStatusEnum from "@enums/product-status.enum";
import StockMovementTypeEnum from "@enums/stock-movement-type.enum";
import { productVariants } from "@models/product-variant.model";
import { products } from "@models/product.model";
import { stockMovements } from "@models/stock-movement.model";
import { warehouseStocks } from "@models/warehouse-stock.model";
import { warehouses } from "@models/warehouse.model";

/**
 * Stok awal untuk data showcase (development / demo, BUKAN production): setiap varian aktif dari produk Aktif yang
 * belum punya stok di gudang aktif pertama diberi 8-40 unit (mutasi "stock_in"). Aman dijalankan berulang.
 *
 *   npm run db:seed:demo-stock --workspace @ortic/api
 */
const run = async (): Promise<void> => {
  if (process.env.NODE_ENV === "production") throw new Error("Demo stock is not allowed in production");

  const [warehouse] = await db.select().from(warehouses).where(eq(warehouses.isActive, true)).orderBy(warehouses.id).limit(1);
  if (!warehouse) throw new Error("No active warehouse");

  const variants = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(warehouseStocks, and(eq(warehouseStocks.variantId, productVariants.id), eq(warehouseStocks.warehouseId, warehouse.id)))
    .where(and(eq(productVariants.isActive, true), eq(products.status, ProductStatusEnum.active), sql`coalesce(${warehouseStocks.quantity}, 0) = 0`));

  await db.transaction(async (tx) => {
    for (const [index, variant] of variants.entries()) {
      // Variasi jumlah supaya ada yang menipis (<= 5) untuk mencoba notifikasi & laporan stok.
      const quantity = index % 9 === 4 ? 3 : 8 + ((index * 7) % 33);
      await tx
        .insert(warehouseStocks)
        .values({ warehouseId: warehouse.id, variantId: variant.id, quantity })
        .onDuplicateKeyUpdate({ set: { quantity: sql`${warehouseStocks.quantity} + ${quantity}` } });
      await tx.insert(stockMovements).values({
        warehouseId: warehouse.id,
        variantId: variant.id,
        type: StockMovementTypeEnum.stock_in,
        quantity,
        referenceType: "seed",
        note: "Stok awal (data demo)",
      });
    }
  });
  console.log(`[demo-stock] ${variants.length} variant(s) stocked at ${warehouse.name}`);
};

run()
  .catch((error) => {
    console.error("[demo-stock] failed", error);
    process.exitCode = 1;
  })
  .finally(closeDatabaseConnection);
