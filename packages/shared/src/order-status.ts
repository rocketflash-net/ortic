// Status pesanan Ortic (lihat docs/PRD.md bagian "Konfirmasi pesanan" dan "Pemetaan status Biteship").
export const OrderStatus = {
  awaitingPayment: "awaiting_payment",
  paid: "paid",
  awaitingConfirmation: "awaiting_confirmation",
  processing: "processing",
  awaitingPickup: "awaiting_pickup",
  shipped: "shipped",
  completed: "completed",
  cancelled: "cancelled",
  rejected: "rejected",
  returned: "returned",
  needsAction: "needs_action",
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

export const ORDER_STATUS_LABELS: Record<OrderStatusType, string> = {
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
