// Jenis baris riwayat pesanan (order_events).
// status   : status pesanan Ortic berubah (lunas, diterima, ditolak, selesai, ...)
// tracking : update dari kurir lewat Biteship (webhook / rekonsiliasi)
// note     : catatan admin (refund, booking gagal, ...); tidak ditampilkan ke pembeli
const OrderEventTypeEnum = {
  status: "status",
  tracking: "tracking",
  note: "note",
} as const;

type OrderEventTypeType = (typeof OrderEventTypeEnum)[keyof typeof OrderEventTypeEnum];

const ORDER_EVENT_TYPES = Object.values(OrderEventTypeEnum) as [OrderEventTypeType, ...OrderEventTypeType[]];

export default OrderEventTypeEnum;
export { ORDER_EVENT_TYPES, type OrderEventTypeType };
