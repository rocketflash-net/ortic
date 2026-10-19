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

export default OrderStatusEnum;
export { ORDER_STATUSES, type OrderStatusType };
