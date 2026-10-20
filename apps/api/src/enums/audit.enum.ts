// Aksi yang dicatat di audit_logs. Menambah aksi: tambahkan di sini (+ migration ENUM).
const AuditActionEnum = {
  user_role_updated: "user.role_updated",
  user_warehouse_updated: "user.warehouse_updated",
  warehouse_created: "warehouse.created",
  warehouse_updated: "warehouse.updated",
  product_created: "product.created",
  product_updated: "product.updated",
  product_status_updated: "product.status_updated",
  brand_created: "brand.created",
  order_status_updated: "order.status_updated",
  order_accepted: "order.accepted",
  order_rejected: "order.rejected",
  order_refunded: "order.refunded",
  order_shipment_booked: "order.shipment_booked",
  stock_adjusted: "stock.adjusted",
  stock_transferred: "stock.transferred",
  stock_threshold_updated: "stock.threshold_updated",
  settings_updated: "settings.updated",
  courier_updated: "courier.updated",
  category_updated: "category.updated",
  product_duplicated: "product.duplicated",
  product_imported: "product.imported",
  product_repriced: "product.repriced",
} as const;

type AuditActionType = (typeof AuditActionEnum)[keyof typeof AuditActionEnum];

const AUDIT_ACTIONS = Object.values(AuditActionEnum) as [AuditActionType, ...AuditActionType[]];

// Asal aksi: dashboard admin atau CLI di server.
const AuditSourceEnum = {
  dashboard: "dashboard",
  cli: "cli",
} as const;

type AuditSourceType = (typeof AuditSourceEnum)[keyof typeof AuditSourceEnum];

const AUDIT_SOURCES = Object.values(AuditSourceEnum) as [AuditSourceType, ...AuditSourceType[]];

export { AuditActionEnum, AUDIT_ACTIONS, type AuditActionType, AuditSourceEnum, AUDIT_SOURCES, type AuditSourceType };
