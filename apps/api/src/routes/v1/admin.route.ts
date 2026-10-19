import { Router } from "express";
import { listAdmins, listAuditLogs, listUsers, storeAdmin, updateUserRole } from "@controllers/admin.controller";
import * as product from "@controllers/product.controller";
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
router.get("/admins", can(PermissionEnum.admins_manage), listAdmins);
router.post("/admins", can(PermissionEnum.admins_manage), storeAdmin);

// Produk (Staf & Owner). Harga dasar & markup hanya terlihat/berubah untuk Owner (prices:manage, dicek di service).
router.get("/products", can(PermissionEnum.products_manage), product.index);
router.post("/products", can(PermissionEnum.products_manage), product.store);
router.post("/products/images/presign", can(PermissionEnum.products_manage, PermissionEnum.media_upload), product.presignImage);
router.get("/products/pricing-defaults", can(PermissionEnum.prices_manage), product.pricingDefaults);
router.get("/products/:id", can(PermissionEnum.products_manage), product.show);
router.put("/products/:id", can(PermissionEnum.products_manage), product.update);
router.patch("/products/:id/status", can(PermissionEnum.products_manage), product.updateStatus);
router.get("/brands", can(PermissionEnum.products_manage), product.brands);
router.post("/brands", can(PermissionEnum.products_manage), product.storeBrand);

// Pengaturan gudang. Staf boleh melihat (untuk tahu asal pengiriman), hanya Owner yang mengubah.
router.get("/warehouses", can(PermissionEnum.dashboard_view), warehouse.index);
router.get("/warehouses/:id", can(PermissionEnum.dashboard_view), warehouse.show);
router.post("/warehouses", can(PermissionEnum.warehouses_manage), warehouse.store);
router.patch("/warehouses/:id", can(PermissionEnum.warehouses_manage), warehouse.update);

// Estimasi ongkir untuk staf (menjawab pertanyaan pembeli). Memakai mock bila BITESHIP_MOCK_RATES=true.
router.post("/shipping/rates", can(PermissionEnum.dashboard_view), biteshipLimiter, shipping.rates);

router.get("/audit-logs", can(PermissionEnum.audit_logs_read), listAuditLogs);

export default router;
