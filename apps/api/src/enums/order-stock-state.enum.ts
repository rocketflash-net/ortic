// Status stok sebuah pesanan, supaya reservasi/potong/kembalikan stok tidak pernah terjadi dua kali.
// reserved  : checkout memesan stok (warehouse_stocks.reserved) selama QRIS berlaku
// committed : lunas, stok terpotong (quantity berkurang, mutasi "sale")
// released  : batal/kedaluwarsa sebelum lunas, reservasi dilepas
// returned  : pesanan lunas ditolak atau paket kembali, stok dikembalikan (mutasi "sale_release" / "return")
const OrderStockStateEnum = {
  reserved: "reserved",
  committed: "committed",
  released: "released",
  returned: "returned",
} as const;

type OrderStockStateType = (typeof OrderStockStateEnum)[keyof typeof OrderStockStateEnum];

const ORDER_STOCK_STATES = Object.values(OrderStockStateEnum) as [OrderStockStateType, ...OrderStockStateType[]];

export default OrderStockStateEnum;
export { ORDER_STOCK_STATES, type OrderStockStateType };
