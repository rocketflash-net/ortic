import Service from "@base/service.base";
import StockDto from "@dto/stock.dto";
import { AuditActionEnum } from "@enums/audit.enum";
import NotificationTypeEnum from "@enums/notification-type.enum";
import OrderStockStateEnum, { OrderStockStateType } from "@enums/order-stock-state.enum";
import StockMovementTypeEnum, { StockMovementTypeType } from "@enums/stock-movement-type.enum";
import ForbiddenException from "@exceptions/forbidden.exception";
import NotFoundException from "@exceptions/not-found.exception";
import ValidationException from "@exceptions/validation.exception";
import OrderRepository from "@repositories/order.repository";
import ProductRepository from "@repositories/product.repository";
import StockRepository from "@repositories/stock.repository";
import WarehouseRepository from "@repositories/warehouse.repository";
import AuditLogService from "@services/audit-log.service";
import NotificationService from "@services/notification.service";
import { AuditActorType } from "@@types/audit.type";
import { AuthUserType } from "@@types/auth.type";
import { DatabaseExecutorType } from "@@types/database.type";
import { OrderItemType, OrderType, WarehouseStockType } from "@@types/entity.type";
import ResponseType from "@@types/response.type";
import { buildPaginationMeta, toPaginationOptions } from "@utils/pagination.util";
import {
  AdjustStockInputType,
  ListStockQueryType,
  StockMovementQueryType,
  TransferStockInputType,
  UpdateThresholdInputType,
} from "@validators/stock.validator";

type StockLineType = { variantId: number; quantity: number; label?: string };

type LowStockType = { warehouseId: number; variantId: number; available: number; threshold: number };

/**
 * Stok per gudang. Tersedia untuk dijual = quantity - reserved.
 *
 * Alur stok sebuah pesanan (orders.stock_state, diubah compare-and-set supaya tidak pernah dobel):
 * - checkout     : reserve()       reserved += qty                         -> reserved
 * - lunas        : commitOrder()   quantity -= qty, reserved -= qty, "sale" -> committed
 * - batal/expired: releaseOrder()  reserved -= qty                         -> released
 * - ditolak/retur: returnOrder()   quantity += qty, "sale_release"/"return" -> returned
 * Setiap perubahan quantity dicatat di kartu stok (stock_movements).
 */
export default class StockService extends Service {
  constructor(
    private readonly stockRepository: StockRepository = new StockRepository(),
    private readonly orderRepository: OrderRepository = new OrderRepository(),
    private readonly warehouseRepository: WarehouseRepository = new WarehouseRepository(),
    private readonly productRepository: ProductRepository = new ProductRepository(),
    private readonly auditLogService: AuditLogService = new AuditLogService(),
    private readonly notificationService: NotificationService = new NotificationService()
  ) {
    super();
  }

  // ----- Pesanan -----

  // Pesan stok di dalam transaction checkout. Stok kurang -> 422 per baris keranjang.
  async reserve(executor: DatabaseExecutorType, warehouseId: number, lines: StockLineType[]): Promise<void> {
    const repository = this.stockRepository.withTransaction(executor);
    const variantIds = lines.map((line) => line.variantId);
    await repository.ensureRows(warehouseId, variantIds);
    const rows = await repository.lockRows(warehouseId, variantIds);

    const errors = lines.flatMap((line, index) => {
      const row = rows.get(line.variantId)!;
      const available = row.quantity - row.reserved;
      return available >= line.quantity
        ? []
        : [{ field: `items.${index}`, message: available > 0 ? `Only ${available} left in stock` : "Out of stock", available: Math.max(available, 0) }];
    });
    if (errors.length) throw new ValidationException(errors, "Some items are out of stock");

    for (const line of lines) {
      const row = rows.get(line.variantId)!;
      await repository.updateRow(row.id, { reserved: row.reserved + line.quantity });
    }
  }

  // Lepas reservasi pesanan yang batal/kedaluwarsa sebelum dibayar.
  async releaseOrder(order: OrderType): Promise<void> {
    await this.orderRepository.transaction(async (tx) => {
      if (!(await this.moveState(tx, order.id, [OrderStockStateEnum.reserved], OrderStockStateEnum.released))) return;
      const items = await this.orderRepository.withTransaction(tx).findItems([order.id]);
      const repository = this.stockRepository.withTransaction(tx);
      const rows = await repository.lockRows(order.warehouseId, this.variantIds(items));
      for (const item of items) {
        const row = item.variantId ? rows.get(item.variantId) : undefined;
        if (row) await repository.updateRow(row.id, { reserved: Math.max(row.reserved - item.quantity, 0) });
      }
    });
  }

  /**
   * Potong stok pesanan yang lunas. Pembayaran yang datang setelah reservasi dilepas (QR sudah kedaluwarsa) tetap
   * memotong stok sebisanya; mengembalikan false bila stok tidak cukup (pesanan perlu ditangani admin).
   */
  async commitOrder(order: OrderType): Promise<boolean> {
    const lowStock: LowStockType[] = [];
    const sufficient = await this.orderRepository.transaction(async (tx) => {
      const current = await this.orderRepository.withTransaction(tx).findByIdForUpdate(order.id);
      if (!current || (current.stockState !== OrderStockStateEnum.reserved && current.stockState !== OrderStockStateEnum.released)) return true;
      const wasReserved = current.stockState === OrderStockStateEnum.reserved;
      await this.orderRepository.withTransaction(tx).update(order.id, { stockState: OrderStockStateEnum.committed });

      const items = await this.orderRepository.withTransaction(tx).findItems([order.id]);
      const repository = this.stockRepository.withTransaction(tx);
      await repository.ensureRows(order.warehouseId, this.variantIds(items));
      const rows = await repository.lockRows(order.warehouseId, this.variantIds(items));
      let enough = true;
      for (const item of items) {
        const row = item.variantId ? rows.get(item.variantId) : undefined;
        if (!row) continue;
        const reserved = wasReserved ? Math.max(row.reserved - item.quantity, 0) : row.reserved;
        const free = wasReserved ? row.quantity : row.quantity - row.reserved;
        const taken = Math.min(item.quantity, Math.max(free, 0));
        if (taken < item.quantity) enough = false;
        const quantity = row.quantity - taken;
        await repository.updateRow(row.id, { quantity, reserved });
        if (quantity - reserved <= row.lowStockThreshold)
          lowStock.push({ warehouseId: row.warehouseId, variantId: row.variantId, available: quantity - reserved, threshold: row.lowStockThreshold });
      }
      await repository.storeMovements(
        items
          .filter((item) => item.variantId && rows.has(item.variantId))
          .map((item) => ({
            warehouseId: order.warehouseId,
            variantId: item.variantId!,
            type: StockMovementTypeEnum.sale,
            quantity: -item.quantity,
            referenceType: "order",
            referenceId: order.code,
            note: enough ? null : "Stok tidak cukup saat pembayaran diterima",
          }))
      );
      return enough;
    });
    await this.notifyLowStock(lowStock);
    return sufficient;
  }

  // Kembalikan stok pesanan lunas yang ditolak (sale_release) atau paketnya kembali ke gudang (return).
  async returnOrder(order: OrderType, type: Extract<StockMovementTypeType, "sale_release" | "return">, actorUserId: number | null = null): Promise<void> {
    await this.orderRepository.transaction(async (tx) => {
      if (!(await this.moveState(tx, order.id, [OrderStockStateEnum.committed], OrderStockStateEnum.returned))) {
        // Belum dibayar tetapi ditolak: cukup lepas reservasinya.
        if (await this.moveState(tx, order.id, [OrderStockStateEnum.reserved], OrderStockStateEnum.released)) {
          const items = await this.orderRepository.withTransaction(tx).findItems([order.id]);
          const repository = this.stockRepository.withTransaction(tx);
          const rows = await repository.lockRows(order.warehouseId, this.variantIds(items));
          for (const item of items) {
            const row = item.variantId ? rows.get(item.variantId) : undefined;
            if (row) await repository.updateRow(row.id, { reserved: Math.max(row.reserved - item.quantity, 0) });
          }
        }
        return;
      }
      const items = await this.orderRepository.withTransaction(tx).findItems([order.id]);
      const repository = this.stockRepository.withTransaction(tx);
      await repository.ensureRows(order.warehouseId, this.variantIds(items));
      const rows = await repository.lockRows(order.warehouseId, this.variantIds(items));
      for (const item of items) {
        const row = item.variantId ? rows.get(item.variantId) : undefined;
        if (row) await repository.updateRow(row.id, { quantity: row.quantity + item.quantity });
      }
      await repository.storeMovements(
        items
          .filter((item) => item.variantId && rows.has(item.variantId))
          .map((item) => ({
            warehouseId: order.warehouseId,
            variantId: item.variantId!,
            type,
            quantity: item.quantity,
            referenceType: "order",
            referenceId: order.code,
            actorUserId,
            note: type === StockMovementTypeEnum.return ? "Paket kembali ke gudang" : "Pesanan ditolak",
          }))
      );
    });
  }

  // ----- Dashboard admin -----

  async levels(query: ListStockQueryType, user: AuthUserType): Promise<ResponseType> {
    const warehouseId = query.warehouse_id ?? user.warehouseId ?? (await this.defaultWarehouseId());
    this.assertWarehouseAccess(user, warehouseId);
    const filter = { warehouseId, search: query.search, level: query.level, categoryId: query.category_id };
    const [rows, total] = await Promise.all([this.stockRepository.findLevels(filter, toPaginationOptions(query)), this.stockRepository.countLevels(filter)]);
    const images = await this.productRepository.primaryImages([...new Set(rows.map((row) => row.productId))]);
    return this.success(
      rows.map((row) => StockDto.level(row, images.get(row.productId) ?? null)),
      "Success",
      undefined,
      { pagination: buildPaginationMeta(query, total), warehouse_id: warehouseId }
    );
  }

  async movements(query: StockMovementQueryType, user: AuthUserType): Promise<ResponseType> {
    const warehouseId = query.warehouse_id ?? user.warehouseId ?? undefined;
    if (warehouseId) this.assertWarehouseAccess(user, warehouseId);
    const [rows, total] = await Promise.all([
      this.stockRepository.findMovements(query.variant_id, warehouseId, toPaginationOptions(query)),
      this.stockRepository.countMovements(query.variant_id, warehouseId),
    ]);
    return this.success(rows.map(StockDto.movement), "Success", undefined, { pagination: buildPaginationMeta(query, total) });
  }

  /**
   * Stok masuk (+qty) atau stok opname (set ke hasil hitung). Hasil opname tidak boleh lebih kecil dari stok yang
   * sedang dipesan pembeli (reserved).
   */
  async adjust(input: AdjustStockInputType, user: AuthUserType, actor: AuditActorType): Promise<ResponseType> {
    this.assertWarehouseAccess(user, input.warehouse_id);
    await this.assertWarehouse(input.warehouse_id);
    await this.assertVariant(input.variant_id);

    const lowStock: LowStockType[] = [];
    await this.stockRepository.transaction(async (tx) => {
      const repository = this.stockRepository.withTransaction(tx);
      await repository.ensureRows(input.warehouse_id, [input.variant_id]);
      const row = (await repository.lockRows(input.warehouse_id, [input.variant_id])).get(input.variant_id)!;

      const delta = input.type === StockMovementTypeEnum.stock_in ? input.quantity : input.quantity - row.quantity;
      const quantity = row.quantity + delta;
      if (quantity < row.reserved) {
        throw new ValidationException([{ field: "quantity", message: `${row.reserved} unit(s) are reserved by unpaid orders; stock cannot go below that` }]);
      }
      if (delta === 0) return;

      await repository.updateRow(row.id, { quantity });
      await repository.storeMovements([
        {
          warehouseId: input.warehouse_id,
          variantId: input.variant_id,
          type: input.type,
          quantity: delta,
          actorUserId: actor.userId,
          note: input.note,
          referenceType: "manual",
        },
      ]);
      await this.auditLogService.record(tx, actor, {
        action: AuditActionEnum.stock_adjusted,
        targetType: "variant",
        targetId: input.variant_id,
        metadata: { warehouse_id: input.warehouse_id, type: input.type, before: row.quantity, after: quantity, note: input.note },
      });
      if (quantity - row.reserved <= row.lowStockThreshold)
        lowStock.push({ warehouseId: row.warehouseId, variantId: row.variantId, available: quantity - row.reserved, threshold: row.lowStockThreshold });
    });
    await this.notifyLowStock(lowStock);
    return this.success(await this.levelOf(input.warehouse_id, input.variant_id), "Stock updated");
  }

  // Pindahkan stok tersedia antar gudang (transfer_out di asal, transfer_in di tujuan).
  async transfer(input: TransferStockInputType, user: AuthUserType, actor: AuditActorType): Promise<ResponseType> {
    if (input.from_warehouse_id === input.to_warehouse_id)
      throw new ValidationException([{ field: "to_warehouse_id", message: "Choose a different destination warehouse" }]);
    this.assertWarehouseAccess(user, input.from_warehouse_id);
    await Promise.all([this.assertWarehouse(input.from_warehouse_id), this.assertWarehouse(input.to_warehouse_id), this.assertVariant(input.variant_id)]);

    await this.stockRepository.transaction(async (tx) => {
      const repository = this.stockRepository.withTransaction(tx);
      await repository.ensureRows(input.from_warehouse_id, [input.variant_id]);
      await repository.ensureRows(input.to_warehouse_id, [input.variant_id]);
      // Kunci berurutan menurut id gudang supaya dua transfer berlawanan arah tidak deadlock.
      const [firstId, secondId] = [input.from_warehouse_id, input.to_warehouse_id].sort((a, b) => a - b);
      const locked = new Map<number, WarehouseStockType>();
      for (const warehouseId of [firstId, secondId])
        locked.set(warehouseId, (await repository.lockRows(warehouseId, [input.variant_id])).get(input.variant_id)!);
      const source = locked.get(input.from_warehouse_id)!;
      const target = locked.get(input.to_warehouse_id)!;

      const available = source.quantity - source.reserved;
      if (input.quantity > available) throw new ValidationException([{ field: "quantity", message: `Only ${Math.max(available, 0)} available to transfer` }]);

      await repository.updateRow(source.id, { quantity: source.quantity - input.quantity });
      await repository.updateRow(target.id, { quantity: target.quantity + input.quantity });
      const reference = `TRF-${Date.now().toString(36).toUpperCase()}`;
      await repository.storeMovements([
        {
          warehouseId: input.from_warehouse_id,
          variantId: input.variant_id,
          type: StockMovementTypeEnum.transfer_out,
          quantity: -input.quantity,
          referenceType: "transfer",
          referenceId: reference,
          actorUserId: actor.userId,
          note: input.note,
        },
        {
          warehouseId: input.to_warehouse_id,
          variantId: input.variant_id,
          type: StockMovementTypeEnum.transfer_in,
          quantity: input.quantity,
          referenceType: "transfer",
          referenceId: reference,
          actorUserId: actor.userId,
          note: input.note,
        },
      ]);
      await this.auditLogService.record(tx, actor, {
        action: AuditActionEnum.stock_transferred,
        targetType: "variant",
        targetId: input.variant_id,
        metadata: { from_warehouse_id: input.from_warehouse_id, to_warehouse_id: input.to_warehouse_id, quantity: input.quantity, reference, note: input.note },
      });
    });
    return this.success(await this.levelOf(input.from_warehouse_id, input.variant_id), "Stock transferred");
  }

  async updateThreshold(input: UpdateThresholdInputType, user: AuthUserType, actor: AuditActorType): Promise<ResponseType> {
    this.assertWarehouseAccess(user, input.warehouse_id);
    await this.assertWarehouse(input.warehouse_id);
    await this.assertVariant(input.variant_id);
    await this.stockRepository.transaction(async (tx) => {
      const repository = this.stockRepository.withTransaction(tx);
      await repository.ensureRows(input.warehouse_id, [input.variant_id]);
      const row = (await repository.lockRows(input.warehouse_id, [input.variant_id])).get(input.variant_id)!;
      await repository.updateRow(row.id, { lowStockThreshold: input.low_stock_threshold });
      await this.auditLogService.record(tx, actor, {
        action: AuditActionEnum.stock_threshold_updated,
        targetType: "variant",
        targetId: input.variant_id,
        metadata: { warehouse_id: input.warehouse_id, before: row.lowStockThreshold, after: input.low_stock_threshold },
      });
    });
    return this.success(await this.levelOf(input.warehouse_id, input.variant_id), "Threshold updated");
  }

  // Staf yang dikaitkan ke satu gudang hanya boleh mengelola gudang itu.
  assertWarehouseAccess(user: AuthUserType, warehouseId: number): void {
    if (user.warehouseId && user.warehouseId !== warehouseId) throw new ForbiddenException("You can only manage your own warehouse");
  }

  private async levelOf(warehouseId: number, variantId: number) {
    const rows = await this.stockRepository.findByVariants([variantId]);
    const row = rows.find((item) => item.warehouseId === warehouseId);
    return {
      warehouse_id: warehouseId,
      variant_id: variantId,
      quantity: row?.quantity ?? 0,
      reserved: row?.reserved ?? 0,
      available: Math.max((row?.quantity ?? 0) - (row?.reserved ?? 0), 0),
      low_stock_threshold: row?.lowStockThreshold ?? 5,
    };
  }

  private async moveState(executor: DatabaseExecutorType, orderId: number, from: OrderStockStateType[], to: OrderStockStateType): Promise<boolean> {
    return await this.orderRepository.withTransaction(executor).transitionStock(orderId, from, to);
  }

  private variantIds(items: OrderItemType[]): number[] {
    return [...new Set(items.flatMap((item) => (item.variantId ? [item.variantId] : [])))];
  }

  private async defaultWarehouseId(): Promise<number> {
    const warehouse = (await this.warehouseRepository.findAll()).find((item) => item.isActive);
    if (!warehouse) throw new NotFoundException("No active warehouse");
    return warehouse.id;
  }

  private async assertWarehouse(id: number): Promise<void> {
    if (!(await this.warehouseRepository.findById(id))) throw new NotFoundException("Warehouse not found");
  }

  private async assertVariant(id: number): Promise<void> {
    if (!(await this.productRepository.findVariantById(id))) throw new NotFoundException("Variant not found");
  }

  private async notifyLowStock(items: LowStockType[]): Promise<void> {
    if (items.length === 0) return;
    const variants = await this.productRepository.findVariantLabels(items.map((item) => item.variantId));
    for (const item of items) {
      const label = variants.get(item.variantId) ?? `Varian #${item.variantId}`;
      await this.notificationService.notify({
        type: NotificationTypeEnum.low_stock,
        title: item.available <= 0 ? `Stok habis: ${label}` : `Stok menipis: ${label}`,
        body: `Tersisa ${Math.max(item.available, 0)} (batas ${item.threshold}).`,
        link: `/stocks?warehouse_id=${item.warehouseId}&search=${encodeURIComponent(label.split(" · ")[0])}`,
        warehouseId: item.warehouseId,
      });
    }
  }
}

export { type StockLineType };
