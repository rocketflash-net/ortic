// Refund pesanan yang sudah dibayar lalu ditolak. Refund dilakukan manual oleh Owner (transfer), lalu ditandai selesai.
const RefundStatusEnum = {
  none: "none",
  pending: "pending",
  refunded: "refunded",
} as const;

type RefundStatusType = (typeof RefundStatusEnum)[keyof typeof RefundStatusEnum];

const REFUND_STATUSES = Object.values(RefundStatusEnum) as [RefundStatusType, ...RefundStatusType[]];

export default RefundStatusEnum;
export { REFUND_STATUSES, type RefundStatusType };
