import { int, mysqlTable, uniqueIndex } from "drizzle-orm/mysql-core";
import { foreignId, id } from "./common/id.column";
import { timestamps } from "./common/timestamps.column";
import { productVariants } from "./product-variant.model";
import { warehouses } from "./warehouse.model";

// Stok satu varian di satu gudang. Tersedia untuk dijual = quantity - reserved.
export const warehouseStocks = mysqlTable(
  "warehouse_stocks",
  {
    id: id(),
    warehouseId: foreignId("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    variantId: foreignId("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: int("quantity", { unsigned: true }).notNull().default(0),
    // Dipesan oleh order yang belum dibayar (QRIS masih berlaku).
    reserved: int("reserved", { unsigned: true }).notNull().default(0),
    lowStockThreshold: int("low_stock_threshold", { unsigned: true }).notNull().default(5),
    ...timestamps,
  },
  (table) => [uniqueIndex("warehouse_stocks_warehouse_variant_unique").on(table.warehouseId, table.variantId)]
);
