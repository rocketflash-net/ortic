import { Router } from "express";
import { listAdmins, listAuditLogs, listUsers, storeAdmin, updateUserRole, updateUserWarehouse } from "@controllers/admin.controller";
import * as order from "@controllers/admin-order.controller";
import * as notification from "@controllers/notification.controller";
import * as product from "@controllers/product.controller";
import * as report from "@controllers/report.controller";
import * as setting from "@controllers/setting.controller";
import * as stock from "@controllers/stock.controller";
import * as shipping from "@controllers/shipping.controller";
import * as warehouse from "@controllers/warehouse.controller";
import { biteshipLimiter } from "@config/rate-limit.config";
import PermissionEnum from "@enums/permission.enum";
import { requirePermission as can } from "@middleware/auth.middleware";

// Dashboard admin. Akses ditentukan permission (lihat registries/role-permission.registry.ts), bukan nama role.
const router = Router();

router.get("/users", can(PermissionEnum.customers_read), listUsers);
// Kelola admin (Owner): tambah lewat email (user dibuat jika belum ada); ubah/cabut lewat PATCH /users/{id}.
router.patch("/users/:id", can(PermissionEnum.admins_manage), updateUserRole);
router.patch("/users/:id/warehouse", can(PermissionEnum.admins_manage), updateUserWarehouse);
router.get("/admins", can(PermissionEnum.admins_manage), listAdmins);
router.post("/admins", can(PermissionEnum.admins_manage), storeAdmin);

// Produk (Staf & Owner). Harga dasar & markup hanya terlihat/berubah untuk Owner (prices:manage, dicek di service).
router.get("/products", can(PermissionEnum.products_manage), product.index);
router.post("/products", can(PermissionEnum.products_manage), product.store);
router.get("/products/export.csv", can(PermissionEnum.products_manage), product.exportCsv);
router.post("/products/import", can(PermissionEnum.products_manage), product.importCsv);
router.post("/products/images/presign", can(PermissionEnum.products_manage, PermissionEnum.media_upload), product.presignImage);
router.get("/products/pricing-defaults", can(PermissionEnum.prices_manage), product.pricingDefaults);
router.get("/products/:id", can(PermissionEnum.products_manage), product.show);
router.put("/products/:id", can(PermissionEnum.products_manage), product.update);
router.patch("/products/:id/status", can(PermissionEnum.products_manage), product.updateStatus);
router.post("/products/:id/duplicate", can(PermissionEnum.products_manage), product.duplicate);
router.get("/brands", can(PermissionEnum.products_manage), product.brands);
router.post("/brands", can(PermissionEnum.products_manage), product.storeBrand);

// Pengaturan gudang. Staf boleh melihat (untuk tahu asal pengiriman), hanya Owner yang mengubah.
router.get("/warehouses", can(PermissionEnum.dashboard_view), warehouse.index);
router.get("/warehouses/:id", can(PermissionEnum.dashboard_view), warehouse.show);
router.post("/warehouses", can(PermissionEnum.warehouses_manage), warehouse.store);
router.patch("/warehouses/:id", can(PermissionEnum.warehouses_manage), warehouse.update);

// Estimasi ongkir untuk staf (menjawab pertanyaan pembeli). Memakai mock bila BITESHIP_MOCK_RATES=true.
router.post("/shipping/rates", can(PermissionEnum.dashboard_view), biteshipLimiter, shipping.rates);

// Kategori (markup per kategori hanya Owner, dicek di service) dan kurir (Owner).
router.get("/categories", can(PermissionEnum.products_manage), setting.categories);
router.patch("/categories/:id", can(PermissionEnum.products_manage), setting.updateCategory);
router.post("/categories/:id/markup-preview", can(PermissionEnum.prices_manage), setting.categoryMarkupPreview);
router.get("/couriers", can(PermissionEnum.dashboard_view), setting.couriers);
router.patch("/couriers/:id", can(PermissionEnum.couriers_manage), setting.updateCourier);

// Pengaturan toko (Owner).
router.get("/settings", can(PermissionEnum.settings_manage), setting.show);
router.put("/settings", can(PermissionEnum.settings_manage), setting.update);
router.post("/settings/pricing-preview", can(PermissionEnum.settings_manage), setting.pricingPreview);

// Stok per gudang (Staf yang dikaitkan ke gudang hanya gudangnya, dicek di service).
router.get("/stocks", can(PermissionEnum.stocks_manage), stock.index);
router.get("/stocks/movements", can(PermissionEnum.stocks_manage), stock.movements);
router.post("/stocks/adjust", can(PermissionEnum.stocks_manage), stock.adjust);
router.post("/stocks/transfer", can(PermissionEnum.stocks_manage), stock.transfer);
router.patch("/stocks/threshold", can(PermissionEnum.stocks_manage), stock.updateThreshold);

// Pesanan.
router.get("/orders", can(PermissionEnum.orders_manage), order.index);
router.get("/orders/:code", can(PermissionEnum.orders_manage), order.show);
router.post("/orders/:code/accept", can(PermissionEnum.orders_manage), order.accept);
router.post("/orders/:code/reject", can(PermissionEnum.orders_manage), order.reject);
router.post("/orders/:code/refund", can(PermissionEnum.orders_manage), order.markRefunded);
router.post("/orders/:code/book-shipment", can(PermissionEnum.orders_manage), biteshipLimiter, order.bookShipment);
router.post("/orders/:code/simulate-shipping", can(PermissionEnum.orders_manage), order.simulateShipping);

// Notifikasi (lonceng + SSE).
router.get("/notifications", can(PermissionEnum.dashboard_view), notification.index);
router.post("/notifications/read", can(PermissionEnum.dashboard_view), notification.markRead);
router.get("/notifications/stream", can(PermissionEnum.dashboard_view), notification.stream);

// Beranda & laporan.
router.get("/dashboard", can(PermissionEnum.dashboard_view), report.dashboard);
router.get("/reports/sales", can(PermissionEnum.reports_read), report.sales);
router.get("/reports/stock", can(PermissionEnum.reports_read), report.stock);
router.get("/reports/orders.csv", can(PermissionEnum.reports_read), report.exportOrders);

router.get("/audit-logs", can(PermissionEnum.audit_logs_read), listAuditLogs);

export default router;
