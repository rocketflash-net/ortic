# Ortic

Toko online alat kedokteran gigi Ortic Indonesia (ortic.id): pembeli login dengan Google atau OTP email, memilih barang, membayar dengan QRIS (BatPay), lalu kurir Biteship menjemput dari gudang Pekanbaru atau Medan. Admin mengelola produk, stok per gudang, pesanan, dan pengaturan dari dashboard.

Kebutuhan produk dan progres pengerjaan: [`docs/PRD.md`](docs/PRD.md).

## Isi repository

| Folder | Isi | Port lokal |
| --- | --- | --- |
| `apps/api` | REST API: Express 5 + Drizzle ORM (MySQL 8) + Zod + TypeScript | 4000 |
| `apps/admin` | Dashboard admin (admin.ortic.id): Vue 3 + Vite + Nuxt UI v4 + Tailwind v4 | 5700 |
| `apps/web` | Toko untuk pembeli (ortic.id): Vue 3 + Vite + Nuxt UI v4 + Tailwind v4 | 5600 |
| `packages/shared` | Status pesanan, format Rupiah (dipakai ketiga aplikasi) | |
| `packages/tsconfig` | Base tsconfig | |
| `assets/brand` | Logo Ortic (SVG) | |

## Menjalankan lokal

```bash
npm install
docker compose up -d                 # MySQL + MinIO (opsional: cukup MySQL lokal + STORAGE_DRIVER=local)

# API
cp apps/api/.env.example apps/api/.env   # isi DB_*; AUTH_DEV_LOGIN_CODE=123456 untuk OTP tetap saat development
npm run db:migrate --workspace @ortic/api
npm run db:seed --workspace @ortic/api   # gudang Pekanbaru, kurir JNE/J&T/SiCepat, pengaturan, kategori
npm run admin --workspace @ortic/api -- grant you@example.com superadmin   # Owner pertama

# Frontend
cp apps/admin/.env.example apps/admin/.env
cp apps/web/.env.example apps/web/.env

npm run dev            # semua aplikasi
npm run dev:api        # atau satu per satu: dev:web, dev:admin
```

Role: `user` = pembeli, `admin` = Staf, `superadmin` = Owner.

### Akun development

| Akun | Role | Login |
| --- | --- | --- |
| `owner@ortic.test` | Owner (`superadmin`) | Dashboard admin http://localhost:5700 → "Masuk dengan email" → kode OTP `123456` |
| `buyer@ortic.test` | Pembeli (`user`) | Toko http://localhost:5600 → Masuk → OTP `123456`; sudah punya 2 alamat (Medan & Jakarta) |
| `staff@ortic.test` | Staf (`admin`) | Sama; untuk mencoba tampilan Staf (tanpa harga dasar/markup, gudang, pengaturan) |

- Kode OTP tetap `123456` berasal dari `AUTH_DEV_LOGIN_CODE` di `apps/api/.env` (hanya development; ditolak saat `NODE_ENV=production`). Tanpa env itu, kode dikirim lewat email/SMTP.
- Akun-akun ini sudah dibuat di database lokal. Untuk database baru, buat ulang dengan:
  ```bash
  npm run admin --workspace @ortic/api -- grant owner@ortic.test superadmin
  npm run admin --workspace @ortic/api -- grant staff@ortic.test admin
  ```
- Akun pembeli tidak perlu dibuat: login di toko (http://localhost:5600) dengan email apa pun, otomatis menjadi `user`.

## Pengecekan

```bash
npm run type-check
npm run build
```
