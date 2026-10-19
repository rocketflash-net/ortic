# PRD Ortic ID — Toko Online Alat Kedokteran Gigi

Versi 2.1 · 19 Oktober 2026 · Domain: ortic.id
Versi lengkap (dengan diagram): `prd/PRD-Ortic-ID.html` → `PRD Ortic ID.pdf` di folder Rocket Project.

---

## Cara memakai dokumen ini

- File ini adalah sumber kebenaran progres pengerjaan. Perbarui **setiap kali satu fitur selesai** atau **ada perubahan keputusan**.
- Status: `[x]` selesai · `[~]` sedang dikerjakan / sebagian · `[ ]` belum mulai.
- Setiap perubahan dicatat di bagian **Changelog** (paling bawah), terbaru di atas, dengan tanggal.
- Jika keputusan produk berubah, ubah juga bagian **Keputusan** dan PRD HTML/PDF.

---

## 0. Posisi terakhir & lanjut berikutnya

_Diperbarui 19 Oktober 2026 (akhir sesi). Detail per fitur ada di tabel progres & changelog._

**Sudah jalan end-to-end (lokal):**
- Admin: login OTP, Produk (CRUD, varian, foto, harga dasar + markup), Gudang (+ area Biteship), Estimasi Ongkir, Pelanggan, Admin.
- Toko: beranda, katalog per kategori, pencarian, detail produk, keranjang, checkout (alamat + kurir + asuransi), bayar **QRIS BatPay sandbox**, halaman bayar (QR, hitung mundur, polling), riwayat & detail pesanan, bantuan.
- **Pembayaran sudah diuji sungguhan oleh pemilik**: generate QRIS → bayar di sandbox → toko menampilkan "Pembayaran berhasil" (status pesanan → `processing`).
- Data showcase: 21 produk aktif (foto ilustrasi buatan, belum foto asli).

**Lanjut berikutnya (urutan disarankan):**
1. **Admin → Pesanan**: daftar & detail pesanan (filter status/gudang/tanggal), Terima/Tolak (`AUTO_ACCEPT_ORDERS=false`), refund manual, notifikasi pesanan baru. Saat ini admin belum bisa melihat pesanan (cek lewat DB / `npm run db:studio --workspace @ortic/api`).
2. **Booking Biteship + tracking** (Fase 3): order terjadwal `/v1/orders` (key test tidak butuh saldo, kata CS Biteship), resi & label, webhook status, Selesai saat `delivered`, rekonsiliasi 2 jam; tampilkan tracking di toko & admin.
3. **Stok per gudang**: kartu stok, transfer, batas checkout & reservasi stok, alokasi gudang Medan/Pekanbaru.
4. Pengaturan toko (markup global, biaya layanan, berat kemasan) & manajemen kurir.

**Yang perlu diingat:**
- Ongkir masih **mock** (`BITESHIP_MOCK_RATES=true`) sampai saldo Biteship diisi; set `false` setelah top up.
- BatPay = akun **sandbox kesan-invitation** (`sg-openapi.batbiz.id`, key di `apps/api/keys/`, gitignored). Callback akun itu ke server kesan-invitation, jadi status Ortic dari Check Status (`qr-mpm-query`); callback Ortic tetap aktif untuk akun Ortic saat production.
- Upload foto memakai `STORAGE_DRIVER=local` (file di `ortic/storage`, gitignored; di luar `apps/api` agar `node --watch` tidak restart).
- Gudang Pekanbaru diisi area Rumbai 28261 — cek ulang kode pos Villa Mas Permai di Pengaturan Gudang.
- Akun dev (OTP `123456`): `owner@ortic.test` (Owner), `staff@ortic.test` (Staf), `buyer@ortic.test` (Pembeli). Lihat README.
- Jalankan: `npm run dev` di folder `ortic` → API 4000, toko 5600, admin 5700. File `.env` tidak ikut git; salin dari `.env.example` + kredensial yang disimpan terpisah.

---

## 1. Progres pengerjaan

### Fase 1 — Fondasi (minggu 1–2)

| Status | Fitur | Aplikasi | Catatan |
| --- | --- | --- | --- |
| [x] | Monorepo (npm workspaces + Turborepo), salinan pola kesan-invitation | semua | `apps/api`, `apps/admin`, `apps/web`, `packages/shared`, `packages/tsconfig` |
| [x] | Logo Ortic (SVG) dari avatar Instagram | semua | `assets/brand/` (badge, mark, horizontal, horizontal-white) |
| [x] | Tema Ortic: biru/kuning/merah, Bangers + Poppins | admin, web | `src/assets/main.css`, palet Nuxt UI `ortic` + `sunny` |
| [x] | Skema database awal + migration `0000_init` | api | users, sessions, OTP, audit, warehouses, couriers, categories, brands, products, variants, images, warehouse_stocks, stock_movements, settings |
| [x] | Seed: gudang Pekanbaru (Villa Mas Permai), kurir JNE/J&T/SiCepat, pengaturan default, 8 kategori | api | `npm run db:seed` (idempoten) |
| [x] | Login Google + OTP email, sesi JWT + refresh token | api | dari kesan-invitation; Google callback kembali ke `web` atau `admin` (`?app=`) |
| [x] | RBAC: Pembeli (`user`), Staf (`admin`), Owner (`superadmin`) | api, admin | `registries/role-permission.registry.ts`, `shared/models/access.ts` |
| [x] | Manajemen admin & pelanggan (daftar, tambah admin, ubah role) | api, admin | dari kesan-invitation, label Owner/Staf |
| [x] | Pengaturan Gudang: daftar, tambah, ubah (Owner) + audit log | api, admin | `GET/POST/PATCH /admin/warehouses` |
| [x] | Katalog publik: daftar kategori | api, web | `GET /catalog/categories` |
| [x] | Toko: layout (header biru, navigasi bawah mobile, footer), beranda, login, akun | web | port 5600 |
| [x] | Dashboard admin: layout, login, beranda | admin | port 5700 |
| [x] | Pencarian area Biteship di form gudang (ganti input ID manual) | api, admin | `GET /shipping/areas?q=` (login, 30/menit per IP); dipakai ulang untuk alamat pembeli |
| [x] | Estimasi ongkir (gudang → area tujuan) untuk staf | api, admin | `POST /admin/shipping/rates` + halaman Alat → Estimasi Ongkir (termurah/tercepat, salin untuk balas chat, peringatan tarif simulasi). Selama saldo kosong memakai mock `BITESHIP_MOCK_RATES=true` |
| [x] | Produk: CRUD, varian, upload foto, harga dasar + markup + pembulatan | api, admin | Menu Manajemen → Produk. Harga jual = dasar × (1 + markup varian/produk/global) dibulatkan ke atas Rp500, bisa dikunci. Harga dasar & markup hanya Owner (`prices:manage`). Foto maks. 8, dikompres WebP di browser. Riwayat harga lewat audit log |
| [ ] | Produk lanjutan: markup per kategori, harga coret berperiode, editor teks kaya, impor/ekspor CSV, duplikasi produk, pratinjau perubahan markup global | api, admin | dari PRD §9, belum dikerjakan |
| [ ] | Stok per gudang + kartu stok + transfer antar gudang | api, admin | |
| [ ] | Pengaturan toko (markup global, pembulatan, biaya layanan, berat kemasan) | api, admin | tabel `settings` sudah ada |
| [ ] | Manajemen kurir (aktif/nonaktif, layanan) | api, admin | tabel `couriers` sudah ada |
| [x] | Katalog toko: daftar produk per kategori, pencarian, detail produk | api, web | `GET /catalog/products`, `GET /catalog/products/:slug`; halaman `/produk`, `/kategori/:slug`, `/produk/:slug`, `/bantuan`. Stok belum ditampilkan (menunggu fitur stok) |
| [x] | Keranjang di browser (tamu bisa isi) | web | `localStorage`; harga & berat dihitung ulang server saat checkout |
| [ ] | Profil pembeli: nomor WhatsApp, profesi | api, web | kolom `users.phone`, `users.profession` sudah ada |

### Fase 2 — Transaksi (minggu 3–4)

| Status | Fitur | Aplikasi | Catatan |
| --- | --- | --- | --- |
| [x] | Alamat pembeli (Biteship Maps) | api, web | `/me/addresses` (CRUD, alamat utama), pilih kecamatan via pencarian area Biteship di form checkout |
| [ ] | Keranjang server-side + batas stok | api, web | menunggu fitur stok per gudang |
| [~] | Cek ongkir Biteship + alokasi gudang (termurah / pecah 2 paket) | api, web | `POST /checkout/quote` sudah jalan (masih mock). Asal = gudang aktif pertama yang punya area Biteship; alokasi gudang & cache 24 jam menunggu fitur stok |
| [~] | Checkout + reservasi stok | api, web | `POST /checkout` + halaman `/checkout` sudah jalan; reservasi stok menunggu fitur stok |
| [x] | Pembayaran QRIS BatPay + callback + job kedaluwarsa | api, web | Sandbox BatPay (akun kesan-invitation, sementara). Status: callback (aktif) + Check Status `qr-mpm-query` sesuai dokumentasi BatBiz (polling & job). Pesanan batal/kedaluwarsa → QR dibatalkan di BatPay (`qr-mpm-cancel`) |
| [x] | Halaman bayar (QR, hitung mundur, polling 3 detik) | web | `/pesanan/:code`: QR, simpan QR, batal, status lunas otomatis |

### Fase 3 — Fulfillment (minggu 5–6)

| Status | Fitur | Aplikasi | Catatan |
| --- | --- | --- | --- |
| [ ] | Konfirmasi pesanan: `AUTO_ACCEPT_ORDERS` + Terima/Tolak + refund manual | api, admin | config di `config/order.config.ts` |
| [ ] | Booking Biteship terjadwal + resi + label | api, admin | CS Biteship: `/v1/orders` di mode test tidak butuh saldo |
| [ ] | Webhook Biteship + pemetaan status + Selesai saat `delivered` | api | |
| [ ] | Rekonsiliasi tracking tiap 2 jam | api | |
| [ ] | Notifikasi admin (SSE + email) dan email pembeli | api, admin, web | |
| [x] | Riwayat & detail pesanan pembeli | web | `/pesanan`, `/pesanan/:code` (status pengiriman menyusul Fase 3) |
| [ ] | Laporan penjualan, laba (setelah MDR), stok | api, admin | |

### Fase 4 — Uji & rilis (minggu 7–8)

| Status | Fitur | Catatan |
| --- | --- | --- |
| [ ] | Halaman S&K, Kebijakan Privasi, Kebijakan Retur | |
| [ ] | Akun merchant BatPay Ortic + kredensial production | dibuat terpisah saat production. Sekarang memakai akun **sandbox** kesan-invitation (`sg-openapi.batbiz.id`); callback merchant ini terdaftar ke server kesan-invitation, jadi status dicek lewat Check Status (`qr-mpm-query`). Endpoint callback Ortic tetap aktif untuk akun Ortic nanti |
| [ ] | Akun Biteship production + saldo + 2 lokasi asal | |
| [ ] | Domain ortic.id, admin.ortic.id, api.ortic.id, SSL, email SPF/DKIM/DMARC | |
| [ ] | Google OAuth consent screen terverifikasi | |
| [ ] | Pendaftaran PSE Lingkup Privat (Komdigi) | |
| [ ] | Backup DB harian + uji restore | |
| [ ] | UAT bersama pemilik + input produk awal | |

---

## 2. Keputusan yang sudah ditetapkan

| Topik | Keputusan |
| --- | --- |
| Domain | ortic.id (toko), admin.ortic.id (dashboard), api.ortic.id (backend) |
| Pengiriman | Hanya Biteship: cek ongkir, booking, pickup, resi, tracking, webhook |
| Kurir awal | JNE, J&T, SiCepat (batas 3 kurir paket Biteship Starter) |
| Pembayaran | QRIS dinamis BatPay Open API (Batbiz), modul dari kesan-invitation |
| Akun merchant BatPay | Diurus belakangan; development memakai `PAYMENT_PROVIDER=mock` |
| MDR QRIS | Ditanggung pemilik. Default UMI: 0% untuk transaksi ≤ Rp100.000, 0,3% di atasnya (`QRIS_MDR_RATE`, `QRIS_MDR_FREE_MAX`) |
| Gudang | Medan dan Pekanbaru sejak MVP. Seed hanya Gudang Pekanbaru (Villa Mas Permai, Pekanbaru, Riau); alamat lengkap, koordinat, area Biteship, PIC diisi admin. Gudang Medan ditambah admin. Jakarta/Bogor menyusul. |
| Konfirmasi pesanan | `AUTO_ACCEPT_ORDERS=true` (default) langsung diproses; `false` admin wajib klik Terima. Admin selalu bisa Tolak sebelum pickup. |
| Katalog & harga | Diisi admin. Harga jual = harga dasar (termurah di marketplace) × (1 + markup 5%), dibulatkan ke atas Rp500; bisa dikunci manual |
| Biaya ke pembeli | Ongkir + asuransi (opsional, wajib > Rp1 jt) + biaya layanan Rp1.000/paket |
| Logo | Dibuat baru dari avatar Instagram (`assets/brand/`) |
| Tema | Biru #1438C8 (utama), kuning #FFD21F (aksi), merah #D7192A (promo); Bangers (judul) + Poppins (teks); gaya poster komik |
| Tech stack | Sama dengan kesan-invitation: npm workspaces + Turborepo; Express 5 + TypeScript + Drizzle + MySQL 8 + Zod + jose + pino; Vue 3 + Vite + Nuxt UI v4 + Tailwind v4 + Pinia + TanStack Query + valibot + vue-i18n |
| Ditunda | Harga grosir/klinik, COD, gudang Jakarta/Bogor |

---

## 3. Ringkasan produk

Ortic ID (Instagram @ortic_id, "A place to shop a better smile") menjual alat kedokteran gigi, terutama perlengkapan praktikum mahasiswa FKG (artikulator, tang paruh burung, tang 3 jari, kertas pasir/emeri, alas kerja, root elevator, gutta percha, spreader, alkohol 96%, kasa steril). Toko online menggantikan order lewat DM: pembeli login, pilih barang yang stoknya ada, cek ongkir, bayar QRIS, lalu kurir Biteship menjemput ke gudang dan pesanan selesai otomatis saat paket diterima.

Peran:
- **Pembeli** (`user`): dokter gigi, mahasiswa FKG, klinik.
- **Staf** (`admin`): produk, stok, pesanan; bisa dibatasi ke satu gudang.
- **Owner** (`superadmin`): semua, termasuk admin, gudang, kurir, pengaturan toko, audit log.

## 4. Alur pesanan end-to-end

1. Pembeli login (Google / OTP email) dan memilih barang yang stoknya > 0.
2. Checkout: alamat (Biteship Maps), sistem memilih gudang (lengkap + ongkir termurah; jika tidak ada yang lengkap, pecah per gudang), pembeli memilih kurir.
3. Sistem membuat order + QRIS BatPay (berlaku 15 menit), stok dipesan.
4. Pembeli bayar; callback BatPay → status Dibayar, stok terpotong.
5. `AUTO_ACCEPT_ORDERS=true` → langsung diterima; `false` → masuk "Menunggu konfirmasi" sampai admin klik Terima. Admin bisa Tolak (refund manual, stok kembali).
6. Diterima → `POST /v1/orders` Biteship terjadwal (slot pickup gudang, default 13.00 WIB) → resi.
7. Webhook Biteship menggerakkan status; `delivered` → pesanan **Selesai**.
8. QRIS kedaluwarsa → order batal, stok dilepas.

Pemetaan status Biteship → Ortic:
- confirmed, scheduled → Diproses
- allocated, picking_up → Menunggu pickup
- picked, in_transit, dropping_off → Dikirim
- on_hold → Dikirim (ada kendala)
- delivered → Selesai
- rejected, courier_not_found → Perlu tindakan
- return_in_transit, returned → Dikembalikan
- cancelled, disposed → Pengiriman batal

Status pesanan (kode di `packages/shared/src/order-status.ts`): awaiting_payment, paid, awaiting_confirmation, processing, awaiting_pickup, shipped, completed, cancelled, rejected, returned, needs_action.

## 5. Biaya

```
Total dibayar pembeli = harga produk + ongkir + asuransi + biaya layanan
Diterima pemilik      = Total − MDR (0% jika Total ≤ Rp100.000, 0,3% jika lebih)
```

Biteship Starter (mulai 2 Nov 2026): Rp0/bulan, 100 pengiriman/bulan, 3 kurir, 2 lokasi asal; Rates Rp5, Tracking publik Rp10, Maps Rp2 per panggilan. Grow Rp149.000/bulan (2.000 pengiriman, 10 kurir, 5 lokasi).

## 6. Arsitektur & cara menjalankan

```
ortic/
├─ apps/api     Express 5 + Drizzle (port 4000)
├─ apps/admin   Vue 3 + Nuxt UI (port 5700)
├─ apps/web     Vue 3 + Nuxt UI (port 5600)
├─ packages/shared, packages/tsconfig
├─ assets/brand  logo
└─ docs/PRD.md   dokumen ini
```

Menjalankan lokal: lihat `README.md` di root.

Endpoint yang sudah ada:
- `GET /health`, `GET /health/ready`
- `/api/v1/auth/*` (google/start?app=web|admin, google/callback, google/exchange, email/request, email/verify, refresh, logout, me)
- `GET /api/v1/catalog/categories`
- `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id`, `GET|POST /api/v1/admin/admins`
- `GET|POST /api/v1/admin/warehouses`, `GET|PATCH /api/v1/admin/warehouses/:id`
- `GET /api/v1/admin/audit-logs`
- `GET /api/v1/shipping/areas?q=` (wajib login)
- `POST /api/v1/admin/shipping/rates` (`dashboard:view`): estimasi ongkir dari gudang

## 7. Pertanyaan terbuka

- [ ] Apakah logo baru di `assets/brand/` sudah disetujui?
- [x] Akun Biteship + API key sandbox (sudah di `apps/api/.env`)
- [ ] Top up saldo Biteship: API ongkir (`/v1/rates/couriers`) menolak dengan "No sufficient balance" walau memakai key test (masih sama setelah KYC). Sementara pakai `BITESHIP_MOCK_RATES=true`; set `false` setelah top up
- [ ] Pendaftaran akun merchant BatPay Ortic (belakangan, sebelum go-live; endpoint callback Ortic sudah siap)
- [ ] Kode pos & koordinat pasti gudang Villa Mas Permai (sementara area Rumbai 28261)
- [ ] Foto produk asli untuk menggantikan ilustrasi showcase

---

## Changelog

### 2026-10-19
- Pemilik berhasil membayar QRIS sandbox sampai muncul "Pembayaran berhasil" di toko. Catatan progres (bagian 0) diperbarui untuk melanjutkan sesi berikutnya; perubahan di-commit ke branch `feat/kickoff-catalog-checkout`.
- Koreksi: kredensial BatPay kesan-invitation adalah **sandbox** (`sg-openapi.batbiz.id`), bukan production. Check Status disesuaikan dengan dokumentasi BatBiz (Postman "SNAP - API / QRIS MPM / Query Payment Status": body `originalPartnerReferenceNo`, `originalReferenceNo`, `serviceCode` 47, `additionalInfo`; status 00–07). Ditambah Payment Cancellation (`/api/v1.0/qr/qr-mpm-cancel`) saat pembeli membatalkan atau QR kedaluwarsa. Diuji di sandbox: generate → query 03 Pending → cancel → query 06 Failed. Callback BatPay Ortic tetap aktif.
- Checkout QRIS end-to-end. API: `/me/addresses`, `POST /checkout/quote`, `POST /checkout`, `GET /orders`, `GET /orders/:code` (sinkron status ke BatPay selama belum lunas), `POST /orders/:code/cancel`, `POST /orders/:code/simulate-payment` (provider mock), webhook `/webhooks/batpay/v1.0/{access-token/b2b,qr/qr-mpm-notify}` & `/webhooks/mock/payments`; migration `0002_orders_addresses` (user_addresses, orders, order_items). Total = barang + ongkir (+asuransi) + biaya layanan; MDR dicatat di `orders.mdr_amount`. Lunas → `processing` (AUTO_ACCEPT_ORDERS=true) / `awaiting_confirmation`; nominal tidak cocok → `needs_action`. Job kedaluwarsa mengecek BatPay lalu membatalkan QR yang tidak dibayar. BatPay memakai kredensial kesan-invitation (key di `apps/api/keys`, gitignored) dan helper baru `queryQris` (SNAP `/api/v1.0/qr/qr-mpm-query`, diverifikasi: status 03 Pending). Web: halaman checkout (alamat + form area, pilih kurir, asuransi, ringkasan), halaman bayar (QR, hitung mundur, polling 3 detik, simpan QR, batal), daftar & detail pesanan. Gudang Pekanbaru diberi area Rumbai 28261 (ubah di Pengaturan Gudang bila perlu). Akun dev pembeli `buyer@ortic.test`.
- Toko bisa dipakai: kartu kategori & info bisa diklik, pencarian di header (nama/merek/SKU), halaman semua produk & per kategori (urutkan terbaru/harga/nama, paginasi), detail produk (galeri, pilih varian, jumlah, tambah ke keranjang), keranjang (disimpan di browser), Pesanan (login, masih kosong), Bantuan (pembayaran/pricelist/pengiriman). API publik `GET /catalog/products` & `/catalog/products/:slug` (hanya produk Aktif dengan varian aktif, tanpa harga dasar). Toko dikunci ke tema terang (`colorMode: false`) karena di HP mode gelap teks Nuxt UI jadi tidak terbaca; toast dipindah ke bawah header agar tidak menutupi navigasi bawah HP.
- Data showcase di database lokal: 21 produk aktif di 8 kategori (40 varian, merek 3M/GC/Mani/Hygedent/Woodpecker). Harga dasar = batas bawah kisaran Tokopedia (PRD Lampiran A), harga jual dihitung API (+5%, bulat ke atas Rp500). Foto masih ilustrasi buatan (bukan foto produk asli), ganti dengan foto asli lewat form produk.
- Fitur Produk. API: `GET/POST /admin/products`, `GET/PUT /admin/products/:id`, `PATCH /admin/products/:id/status`, `POST /admin/products/images/presign`, `GET /admin/products/pricing-defaults`, `GET/POST /admin/brands`; permission baru `prices:manage` (Owner); migration `0001_product_audit_actions`. Aturan: slug & SKU otomatis (unik), produk Aktif wajib punya foto dan varian aktif berharga, varian yang dihapus tetapi sudah punya riwayat stok hanya dinonaktifkan, Staf hanya bisa mengisi harga varian baru (otomatis dikunci). Admin: daftar produk (cari nama/SKU, filter status & kategori, ubah status cepat) dan form tambah/ubah (info, merek bisa ditambah langsung, foto drag & drop + urutkan, varian & pratinjau harga, spesifikasi, status, slug).
- Storage driver `local` (`STORAGE_DRIVER=local`) supaya upload foto jalan tanpa Docker/MinIO: file di `ortic/storage`, upload lewat URL bertanda tangan ke `PUT /storage/<key>`. Folder sengaja di luar `apps/api` karena di Windows `node --watch` me-restart API saat ada file baru di dalam `apps/api`.
- Akun dev Staf `staff@ortic.test` untuk mencoba tampilan Staf.
- Admin: halaman Estimasi Ongkir (menu Alat). Pilih gudang, cari kecamatan tujuan, berat, asuransi opsional; hasil diurutkan termurah dengan label Termurah/Tercepat dan tombol salin ringkasan untuk balas chat. API mengirim `additionalInfo.is_mock` sehingga halaman memberi peringatan saat memakai tarif simulasi. Pencarian area dipisah jadi komponen bersama `ShippingAreaInput` (dipakai juga di form gudang).
- Mock cek ongkir Biteship (`BITESHIP_MOCK_RATES`, ditolak di production): request/response/error sama persis dengan dokumentasi `POST /v1/rates/couriers` (dicek key per key terhadap contoh di docs), layanan dari `GET /v1/couriers` akun Ortic (JNE REG/YES/OKE/JTR, J&T EZ, SiCepat REG/BEST/GOKIL), tarif perkiraan berdasarkan zona kode pos & berat tagih. Endpoint `POST /admin/shipping/rates`, hanya kurir/layanan aktif, urut termurah. Helper dipindah ke `helpers/biteship/`, tipe di `types/biteship.type.ts`.
- API key sandbox Biteship dipasang. Pencarian area Biteship di form gudang: helper `helpers/biteship.helper.ts`, `GET /shipping/areas?q=`, `ShippingProviderException` (502). Form gudang memakai kolom cari area yang mengisi provinsi, kota, kecamatan, kode pos, dan ID area. Catatan: pencarian Biteship berbasis kecamatan/kota/kode pos, bukan nama perumahan.
- Kick-off proyek: monorepo disalin dari pola kesan-invitation lalu fitur undangan dihapus.
- API: skema awal + migration `0000_init`, seed (gudang Pekanbaru Villa Mas Permai, kurir JNE/J&T/SiCepat, pengaturan default, 8 kategori), RBAC Owner/Staf/Pembeli, login Google per aplikasi (`?app=web|admin`), Pengaturan Gudang, katalog kategori publik, config `AUTO_ACCEPT_ORDERS` / MDR UMI / Biteship.
- Admin: tema Ortic, login, beranda, Pelanggan, Admin, Gudang.
- Web: tema Ortic (gaya poster komik), header biru, navigasi bawah mobile, beranda dengan kategori dari API, login, akun.
- Logo Ortic dibuat (`assets/brand/`).
- Port lokal dipindah ke 4000/5600/5700 agar tidak bentrok dengan kesan-invitation.
- PRD v2.1: kurir JNE/J&T/SiCepat, akun merchant BatPay belakangan, gudang awal Villa Mas Permai, logo baru, stack disamakan dengan kesan-invitation.
