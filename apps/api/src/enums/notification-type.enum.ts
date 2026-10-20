// Notifikasi dashboard admin (lonceng + SSE).
const NotificationTypeEnum = {
  order_paid: "order_paid",
  order_needs_action: "order_needs_action",
  shipment_failed: "shipment_failed",
  order_completed: "order_completed",
  order_returned: "order_returned",
  low_stock: "low_stock",
} as const;

type NotificationTypeType = (typeof NotificationTypeEnum)[keyof typeof NotificationTypeEnum];

const NOTIFICATION_TYPES = Object.values(NotificationTypeEnum) as [NotificationTypeType, ...NotificationTypeType[]];

export default NotificationTypeEnum;
export { NOTIFICATION_TYPES, type NotificationTypeType };
