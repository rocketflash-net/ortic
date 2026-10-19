# Ortic API

REST API untuk Ortic: **Express 5 + Drizzle ORM (MySQL 8) + Zod + TypeScript**. Pola kode (base class, config, middleware, auth, BatPay) diambil dari kesan-invitation.
Kebutuhan produk & progres ada di [`docs/PRD.md`](../../docs/PRD.md).

## Quick start

```bash
# dari root monorepo
npm install
cd apps/api
cp .env.example .env                       # isi DB_*; AUTH_DEV_LOGIN_CODE=123456 untuk development
npm run db:migrate                         # buat tabel
npm run db:seed                            # gudang Pekanbaru, kurir, pengaturan, kategori (idempoten)
npm run admin -- grant you@example.com     # Owner (superadmin) pertama
npm run dev                                # http://localhost:4000
```

`BITESHIP_MOCK_RATES=true` membuat cek ongkir memakai respons palsu berbentuk sama dengan API Biteship (dipakai selama saldo Biteship belum diisi; ditolak di production).

`STORAGE_DRIVER=local` menyimpan upload di `ortic/storage` dan menyajikannya di `http://localhost:4000/storage/...`, jadi development tidak butuh MinIO/Docker. Production memakai `s3` (Cloudflare R2).

Cek `GET /health` (proses hidup) dan `GET /health/ready` (database terjangkau).

Konfigurasi divalidasi saat start (`src/config/env.config.ts`). Log berupa JSON (pino) dengan `requestId`; saat `NODE_ENV=local` dirapikan dengan pino-pretty.

## Struktur

```
src/
├── base/           # Repository, Service, Helper (HTTP client)
├── config/         # app, auth, database, mail, payment, batpay, storage, order (AUTO_ACCEPT_ORDERS, MDR, Biteship)
├── controllers/    # parse request (Zod) -> service -> response
├── database/       # schema barrel, migrations (drizzle-kit), seed + seeders
├── dto/            # bentuk response (snake_case)
├── enums/          # role, permission, audit, status produk, warna kategori, mutasi stok
├── helpers/        # batpay/, payment/ (gateway QRIS), biteship/ (API + mock ongkir), mail/, google-oauth, storage
├── jobs/           # job berkala (bersihkan sesi & OTP; Fase 2: QRIS kedaluwarsa)
├── middleware/     # auth (JWT + RBAC), error, logging, request context
├── models/         # tabel Drizzle
├── registries/     # role -> permission
├── repositories/   # query database
├── routes/         # /api/v1/*
├── services/       # logika bisnis
└── validators/     # skema Zod
```

## Role & permission

| Role | Siapa | Permission |
| --- | --- | --- |
| `user` | Pembeli | `orders:read`, `orders:create` (miliknya sendiri) |
| `admin` | Staf | Semua kecuali `admins:manage`, `warehouses:manage`, `couriers:manage`, `settings:manage`, `audit_logs:read` |
| `superadmin` | Owner | Semua |

## Endpoint

| Endpoint | Akses | Keterangan |
| --- | --- | --- |
| `GET /auth/google/start?app=web\|admin&redirect=` | publik | Login Google; callback kembali ke frontend sesuai `app` |
| `POST /auth/email/request` · `/auth/email/verify` | publik | Login OTP email |
| `POST /auth/refresh` · `/auth/logout` · `GET /auth/me` | publik / login | Token & profil (+ permission) |
| `GET /catalog/categories` | publik | Kategori aktif |
| `GET /catalog/products?search=&category=&sort=&page=&limit=` | publik | Produk Aktif (cari nama/merek/SKU, slug kategori, `newest|price_asc|price_desc|name`) |
| `GET /catalog/products/:slug` | publik | Detail produk + varian aktif (tanpa harga dasar) |
| `GET /admin/users` | `customers:read` | Daftar pelanggan |
| `PATCH /admin/users/:id` · `GET|POST /admin/admins` | `admins:manage` | Kelola admin |
| `GET /admin/warehouses` · `/admin/warehouses/:id` | `dashboard:view` | Daftar & detail gudang |
| `POST /admin/warehouses` · `PATCH /admin/warehouses/:id` | `warehouses:manage` | Tambah & ubah gudang (diaudit) |
| `GET /admin/products` | `products:manage` | Daftar produk (`search` nama/SKU, `category_id`, `status`, paginasi) |
| `POST /admin/products` · `GET|PUT /admin/products/:id` | `products:manage` | Simpan produk lengkap (info + foto + varian). Harga dasar & markup hanya dibaca/diubah dengan `prices:manage` |
| `PATCH /admin/products/:id/status` | `products:manage` | Draft / Aktif / Arsip (Aktif wajib berfoto & punya varian berharga) |
| `POST /admin/products/images/presign` | `products:manage` + `media:upload` | URL upload foto (JPG/PNG/WebP ≤ 5 MB) |
| `GET /admin/products/pricing-defaults` | `prices:manage` | Markup global & pembulatan (pratinjau harga) |
| `GET|POST /admin/brands` | `products:manage` | Merek |
| `GET /admin/audit-logs` | `audit_logs:read` | Jejak aksi admin |
| `GET /shipping/areas?q=` | login | Cari area Biteship (kecamatan/kota/kode pos) untuk form gudang & alamat |
| `POST /admin/shipping/rates` | `dashboard:view` | Estimasi ongkir gudang → area tujuan (kurir aktif, urut termurah) |

Semua path di atas berprefix `/api/v1`.

## Pembayaran QRIS (BatPay)

- `PAYMENT_PROVIDER=batpay` membuat QRIS asli lewat BatPay Open API (SNAP); `mock` untuk development tanpa BatPay (tombol "Simulasikan bayar" muncul di halaman pesanan).
- Status pembayaran masuk lewat dua jalur yang hasilnya sama (`OrderService.applyPayment`):
  1. Webhook BatPay: `POST /api/v1/webhooks/batpay/v1.0/access-token/b2b` lalu `/v1.0/qr/qr-mpm-notify` (daftarkan URL ini di merchant BatPay).
  2. Cek langsung `POST /api/v1.0/qr/qr-mpm-query`: halaman bayar polling `GET /orders/:code` (maks. sekali per 5 detik per order ke BatPay) dan job kedaluwarsa sebelum membatalkan order.
- Pesanan dibatalkan pembeli atau kedaluwarsa → QR juga dibatalkan di BatPay (`POST /api/v1.0/qr/qr-mpm-cancel`), supaya tidak bisa dibayar lagi.
- Sementara memakai akun **sandbox** kesan-invitation (`sg-openapi.batbiz.id`). Callback akun itu terdaftar ke server kesan-invitation, jadi status di Ortic datang dari jalur 2; callback Ortic (jalur 1) tetap aktif untuk akun Ortic sendiri saat production. Ganti `BATPAY_*` dan file di `apps/api/keys/` setelah akun Ortic jadi.
