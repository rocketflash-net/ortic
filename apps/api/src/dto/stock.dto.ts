import { MovementRowType, StockListRowType } from "@repositories/stock.repository";

type StockLevelResponseType = {
  variant_id: number;
  product_id: number;
  product_name: string;
  product_status: string;
  variant_name: string | null;
  sku: string;
  image_url: string | null;
  is_active: boolean;
  quantity: number;
  reserved: number;
  available: number;
  low_stock_threshold: number;
  level: "ok" | "low" | "out";
};

type StockMovementResponseType = {
  id: number;
  warehouse_id: number;
  warehouse_code: string;
  type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  actor_name: string | null;
  created_at: Date;
};

export default class StockDto {
  static level(row: StockListRowType, imageUrl: string | null): StockLevelResponseType {
    const available = row.quantity - row.reserved;
    return {
      variant_id: row.variantId,
      product_id: row.productId,
      product_name: row.productName,
      product_status: row.productStatus,
      variant_name: row.variantName,
      sku: row.sku,
      image_url: imageUrl,
      is_active: row.variantActive,
      quantity: row.quantity,
      reserved: row.reserved,
      available: Math.max(available, 0),
      low_stock_threshold: row.lowStockThreshold,
      level: available <= 0 ? "out" : available <= row.lowStockThreshold ? "low" : "ok",
    };
  }

  static movement({ movement, warehouseCode, actorName }: MovementRowType): StockMovementResponseType {
    return {
      id: movement.id,
      warehouse_id: movement.warehouseId,
      warehouse_code: warehouseCode,
      type: movement.type,
      quantity: movement.quantity,
      reference_type: movement.referenceType,
      reference_id: movement.referenceId,
      note: movement.note,
      actor_name: actorName,
      created_at: movement.createdAt,
    };
  }
}
