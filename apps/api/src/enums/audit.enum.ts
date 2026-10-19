// Aksi yang dicatat di audit_logs. Menambah aksi: tambahkan di sini (+ migration ENUM).
const AuditActionEnum = {
  user_role_updated: "user.role_updated",
  warehouse_created: "warehouse.created",
  warehouse_updated: "warehouse.updated",
  product_created: "product.created",
  product_updated: "product.updated",
  product_status_updated: "product.status_updated",
  brand_created: "brand.created",
  order_status_updated: "order.status_updated",
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
