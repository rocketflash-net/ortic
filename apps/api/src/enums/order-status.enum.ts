// Status pesanan, sama dengan packages/shared/src/order-status.ts (dipakai web & admin).
// Alur: awaiting_payment -> (QRIS lunas) -> processing (AUTO_ACCEPT_ORDERS=true) / awaiting_confirmation (false)
// -> awaiting_pickup -> shipped -> completed. Belum bayar sampai QR kedaluwarsa -> cancelled.
const OrderStatusEnum = {
  awaiting_payment: "awaiting_payment",
  paid: "paid",
  awaiting_confirmation: "awaiting_confirmation",
  processing: "processing",
  awaiting_pickup: "awaiting_pickup",
  shipped: "shipped",
  completed: "completed",
  cancelled: "cancelled",
  rejected: "rejected",
  returned: "returned",
  needs_action: "needs_action",
} as const;

type OrderStatusType = (typeof OrderStatusEnum)[keyof typeof OrderStatusEnum];

const ORDER_STATUSES = Object.values(OrderStatusEnum) as [OrderStatusType, ...OrderStatusType[]];

// Label Indonesia (sama dengan ORDER_STATUS_LABELS di packages/shared), untuk email & ekspor CSV.
const ORDER_STATUS_LABELS: Record<OrderStatusType, string> = {
  awaiting_payment: "Menunggu pembayaran",
  paid: "Dibayar",
  awaiting_confirmation: "Menunggu konfirmasi",
  processing: "Diproses",
  awaiting_pickup: "Menunggu pickup",
  shipped: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  rejected: "Ditolak",
  returned: "Dikembalikan",
  needs_action: "Perlu tindakan",
};

export default OrderStatusEnum;
export { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatusType };
