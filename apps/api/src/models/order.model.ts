import { datetime, index, int, mysqlEnum, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";
import OrderStatusEnum, { ORDER_STATUSES } from "../enums/order-status.enum";
import OrderStockStateEnum, { ORDER_STOCK_STATES } from "../enums/order-stock-state.enum";
import RefundStatusEnum, { REFUND_STATUSES } from "../enums/refund-status.enum";
import { foreignId, id } from "./common/id.column";
import { timestamps } from "./common/timestamps.column";
import { users } from "./user.model";
import { warehouses } from "./warehouse.model";

// Pesanan pembeli: snapshot alamat, kurir, dan biaya saat checkout, plus satu QRIS untuk membayarnya.
// total = items_total + shipping_fee + insurance_fee + service_fee (semua ditanggung pembeli).
export const orders = mysqlTable(
  "orders",
  {
    id: id(),
    // Kode untuk pembeli & admin, mis. ORT-261019-7K3QX.
    code: varchar("code", { length: 32 }).notNull().unique(),
    userId: foreignId("user_id")
      .notNull()
      .references(() => users.id),
    warehouseId: foreignId("warehouse_id")
      .notNull()
      .references(() => warehouses.id),
    status: mysqlEnum("status", ORDER_STATUSES).notNull().default(OrderStatusEnum.awaiting_payment),

    // Alamat kirim (snapshot; alamat di buku alamat boleh berubah setelahnya).
    recipientName: varchar("recipient_name", { length: 100 }).notNull(),
    recipientPhone: varchar("recipient_phone", { length: 20 }).notNull(),
    address: text("address").notNull(),
    province: varchar("province", { length: 100 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    district: varchar("district", { length: 100 }).notNull(),
    postalCode: varchar("postal_code", { length: 10 }).notNull(),
    biteshipAreaId: varchar("biteship_area_id", { length: 64 }).notNull(),
    addressNotes: varchar("address_notes", { length: 255 }),

    // Kurir pilihan pembeli (kode = courier_company & courier_type Biteship).
    courierCode: varchar("courier_code", { length: 32 }).notNull(),
    courierName: varchar("courier_name", { length: 100 }).notNull(),
    courierServiceCode: varchar("courier_service_code", { length: 32 }).notNull(),
    courierServiceName: varchar("courier_service_name", { length: 100 }).notNull(),
    courierDuration: varchar("courier_duration", { length: 50 }),
    // Berat paket untuk ongkir (produk + kemasan), gram.
    weightGram: int("weight_gram", { unsigned: true }).notNull(),
    // Nilai barang yang diasuransikan (0 = tanpa asuransi).
    insuredValue: int("insured_value", { unsigned: true }).notNull().default(0),

    // Rupiah.
    itemsTotal: int("items_total", { unsigned: true }).notNull(),
    shippingFee: int("shipping_fee", { unsigned: true }).notNull(),
    insuranceFee: int("insurance_fee", { unsigned: true }).notNull().default(0),
    serviceFee: int("service_fee", { unsigned: true }).notNull().default(0),
    total: int("total", { unsigned: true }).notNull(),
    // MDR QRIS yang ditanggung pemilik (dicatat untuk laporan laba, tidak ditagihkan ke pembeli).
    mdrAmount: int("mdr_amount", { unsigned: true }).notNull().default(0),

    // Pembayaran QRIS.
    paymentProvider: varchar("payment_provider", { length: 30 }).notNull(),
    // Referensi kita yang dikirim ke provider dan dikirim balik di notifikasi (BatPay: partnerReferenceNo).
    providerRef: varchar("provider_ref", { length: 100 }).unique(),
    // Id transaksi di sistem provider (BatPay: referenceNo), juga dipakai untuk cek status.
    providerTransactionId: varchar("provider_transaction_id", { length: 100 }),
    qrString: text("qr_string"),
    expiresAt: datetime("expires_at").notNull(),
    paidAt: datetime("paid_at"),
    cancelledAt: datetime("cancelled_at"),
    cancelReason: varchar("cancel_reason", { length: 255 }),

    // Stok yang dipesan/terpotong oleh pesanan ini (lihat enums/order-stock-state.enum.ts).
    stockState: mysqlEnum("stock_state", ORDER_STOCK_STATES).notNull().default(OrderStockStateEnum.reserved),

    // Konfirmasi admin (AUTO_ACCEPT_ORDERS=false) dan penolakan. Pesanan lunas yang ditolak wajib direfund manual.
    acceptedAt: datetime("accepted_at"),
    rejectedAt: datetime("rejected_at"),
    rejectReason: varchar("reject_reason", { length: 255 }),
    refundStatus: mysqlEnum("refund_status", REFUND_STATUSES).notNull().default(RefundStatusEnum.none),
    refundAmount: int("refund_amount", { unsigned: true }),
    refundedAt: datetime("refunded_at"),
    refundNote: varchar("refund_note", { length: 255 }),

    // Pengiriman Biteship (order terjadwal). Kosong = belum dibooking.
    biteshipOrderId: varchar("biteship_order_id", { length: 64 }).unique(),
    waybillId: varchar("waybill_id", { length: 64 }),
    courierTrackingId: varchar("courier_tracking_id", { length: 64 }),
    // Status mentah dari Biteship (confirmed, allocated, picked, ..., delivered).
    shippingStatus: varchar("shipping_status", { length: 32 }),
    courierLink: varchar("courier_link", { length: 500 }),
    courierDriverName: varchar("courier_driver_name", { length: 100 }),
    courierDriverPhone: varchar("courier_driver_phone", { length: 30 }),
    // Jadwal pickup yang diminta ke Biteship (WIB).
    pickupScheduledAt: datetime("pickup_scheduled_at"),
    shipmentBookedAt: datetime("shipment_booked_at"),
    shipmentAttempts: int("shipment_attempts", { unsigned: true }).notNull().default(0),
    // Pesan error booking terakhir (ditampilkan ke admin, dicoba ulang otomatis).
    shipmentError: varchar("shipment_error", { length: 255 }),
    shippedAt: datetime("shipped_at"),
    deliveredAt: datetime("delivered_at"),
    completedAt: datetime("completed_at"),
    // Terakhir kali status pengiriman dicek ulang ke Biteship (rekonsiliasi 2 jam).
    trackedAt: datetime("tracked_at"),
    ...timestamps,
  },
  (table) => [
    index("orders_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("orders_status_expires_at_idx").on(table.status, table.expiresAt),
    index("orders_warehouse_id_created_at_idx").on(table.warehouseId, table.createdAt),
    index("orders_paid_at_idx").on(table.paidAt),
  ]
);
