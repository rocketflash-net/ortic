// Jenis mutasi di kartu stok. qty positif = masuk, negatif = keluar.
const StockMovementTypeEnum = {
  stock_in: "stock_in",
  sale: "sale",
  sale_release: "sale_release",
  return: "return",
  adjustment: "adjustment",
  transfer_in: "transfer_in",
  transfer_out: "transfer_out",
} as const;

type StockMovementTypeType = (typeof StockMovementTypeEnum)[keyof typeof StockMovementTypeEnum];

const STOCK_MOVEMENT_TYPES = Object.values(StockMovementTypeEnum) as [StockMovementTypeType, ...StockMovementTypeType[]];

export default StockMovementTypeEnum;
export { STOCK_MOVEMENT_TYPES, type StockMovementTypeType };
