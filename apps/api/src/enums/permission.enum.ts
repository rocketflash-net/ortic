// Permission RBAC dengan format `resource:action`, sama dengan apps/admin/src/shared/models/access.ts.
// Menambah permission: tambahkan di sini, berikan ke role di registries/role-permission.registry.ts,
// lalu pasang `requirePermission(...)` di route yang membutuhkannya.
const PermissionEnum = {
  // Pembeli: pesanan miliknya sendiri.
  orders_read: "orders:read",
  orders_create: "orders:create",

  // Dashboard admin.
  dashboard_view: "dashboard:view",
  customers_read: "customers:read",
  // Menambah/mencabut admin dan mengubah role user (hanya Owner).
  admins_manage: "admins:manage",
  products_manage: "products:manage",
  // Melihat & mengubah harga dasar dan markup produk (hanya Owner). Staf tetap bisa mengelola produk lain-lainnya.
  prices_manage: "prices:manage",
  stocks_manage: "stocks:manage",
  // Terima/tolak pesanan, booking kurir, refund.
  orders_manage: "orders:manage",
  transactions_read: "transactions:read",
  // Laporan penjualan & stok. Laba (butuh harga dasar) hanya untuk yang punya prices:manage.
  reports_read: "reports:read",
  // Simulasi pembayaran QRIS provider mock (hanya tersedia di luar production).
  payments_simulate: "payments:simulate",
  media_upload: "media:upload",
  // Pengaturan gudang, kurir, dan toko (markup, biaya layanan) — hanya Owner.
  warehouses_manage: "warehouses:manage",
  couriers_manage: "couriers:manage",
  settings_manage: "settings:manage",
  audit_logs_read: "audit_logs:read",
} as const;

type PermissionType = (typeof PermissionEnum)[keyof typeof PermissionEnum];

export default PermissionEnum;
export { type PermissionType };
