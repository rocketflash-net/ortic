import { auditLogs } from "@models/audit-log.model";
import { authExchangeCodes } from "@models/auth-exchange-code.model";
import { brands } from "@models/brand.model";
import { categories } from "@models/category.model";
import { couriers } from "@models/courier.model";
import { emailLoginCodes } from "@models/email-login-code.model";
import { orderItems } from "@models/order-item.model";
import { orders } from "@models/order.model";
import { productImages } from "@models/product-image.model";
import { productVariants } from "@models/product-variant.model";
import { products } from "@models/product.model";
import { sessions } from "@models/session.model";
import { settings } from "@models/setting.model";
import { stockMovements } from "@models/stock-movement.model";
import { userAddresses } from "@models/user-address.model";
import { users } from "@models/user.model";
import { warehouseStocks } from "@models/warehouse-stock.model";
import { warehouses } from "@models/warehouse.model";

// Tipe entity diturunkan langsung dari schema Drizzle, jadi selalu sinkron dengan tabel.
// `XxxType` = baris hasil select, `NewXxxType` = payload insert.
type UserType = typeof users.$inferSelect;
type NewUserType = typeof users.$inferInsert;

type SessionType = typeof sessions.$inferSelect;
type NewSessionType = typeof sessions.$inferInsert;

type EmailLoginCodeType = typeof emailLoginCodes.$inferSelect;
type NewEmailLoginCodeType = typeof emailLoginCodes.$inferInsert;

type AuditLogType = typeof auditLogs.$inferSelect;
type NewAuditLogType = typeof auditLogs.$inferInsert;

type AuthExchangeCodeType = typeof authExchangeCodes.$inferSelect;
type NewAuthExchangeCodeType = typeof authExchangeCodes.$inferInsert;

type WarehouseType = typeof warehouses.$inferSelect;
type NewWarehouseType = typeof warehouses.$inferInsert;

type CourierType = typeof couriers.$inferSelect;
type NewCourierType = typeof couriers.$inferInsert;

type CategoryType = typeof categories.$inferSelect;
type NewCategoryType = typeof categories.$inferInsert;

type BrandType = typeof brands.$inferSelect;
type NewBrandType = typeof brands.$inferInsert;

type ProductType = typeof products.$inferSelect;
type NewProductType = typeof products.$inferInsert;

type ProductVariantType = typeof productVariants.$inferSelect;
type NewProductVariantType = typeof productVariants.$inferInsert;

type ProductImageType = typeof productImages.$inferSelect;
type NewProductImageType = typeof productImages.$inferInsert;

type WarehouseStockType = typeof warehouseStocks.$inferSelect;
type NewWarehouseStockType = typeof warehouseStocks.$inferInsert;

type StockMovementType = typeof stockMovements.$inferSelect;
type NewStockMovementType = typeof stockMovements.$inferInsert;

type SettingType = typeof settings.$inferSelect;
type NewSettingType = typeof settings.$inferInsert;

type UserAddressType = typeof userAddresses.$inferSelect;
type NewUserAddressType = typeof userAddresses.$inferInsert;

type OrderType = typeof orders.$inferSelect;
type NewOrderType = typeof orders.$inferInsert;

type OrderItemType = typeof orderItems.$inferSelect;
type NewOrderItemType = typeof orderItems.$inferInsert;

export type {
  UserType,
  NewUserType,
  SessionType,
  NewSessionType,
  EmailLoginCodeType,
  NewEmailLoginCodeType,
  AuditLogType,
  NewAuditLogType,
  AuthExchangeCodeType,
  NewAuthExchangeCodeType,
  WarehouseType,
  NewWarehouseType,
  CourierType,
  NewCourierType,
  CategoryType,
  NewCategoryType,
  BrandType,
  NewBrandType,
  ProductType,
  NewProductType,
  ProductVariantType,
  NewProductVariantType,
  ProductImageType,
  NewProductImageType,
  WarehouseStockType,
  NewWarehouseStockType,
  StockMovementType,
  NewStockMovementType,
  SettingType,
  NewSettingType,
  UserAddressType,
  NewUserAddressType,
  OrderType,
  NewOrderType,
  OrderItemType,
  NewOrderItemType,
};
