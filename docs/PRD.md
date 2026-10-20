# PRD Ortic ID — Toko Online Alat Kedokteran Gigi

Versi 2.2 · 20 Oktober 2026 · Domain: ortic.id
Versi lengkap (dengan diagram): `prd/PRD-Ortic-ID.html` → `PRD Ortic ID.pdf` di folder Rocket Project.

---

## Cara memakai dokumen ini

- File ini adalah sumber kebenaran progres pengerjaan. Perbarui **setiap kali satu fitur selesai** atau **ada perubahan keputusan**.
- Status: `[x]` selesai · `[~]` sedang dikerjakan / sebagian · `[ ]` belum mulai.
- Setiap perubahan dicatat di bagian **Changelog** (paling bawah), terbaru di atas, dengan tanggal.
- Jika keputusan produk berubah, ubah juga bagian **Keputusan** dan PRD HTML/PDF.

---

## 0. Posisi terakhir & lanjut berikutnya

_Diperbarui 20 Oktober 2026. Detail per fitur ada di tabel progres & changelog._

**Semua fitur Fase 1–3 sudah jalan end-to-end (lokal), Fase 4 tinggal pekerjaan di luar kode:**
- Toko: katalog dengan stok & harga promo, keranjang server (tersinkron, keranjang tamu digabung saat login), checkout (alokasi gudang, reservasi stok, S&K), bayar QRIS, pelacakan pengiriman + riwayat, profil (WhatsApp, profesi), halaman S&K / Privasi / Retur.
- Admin: beranda (KPI, pekerjaan menunggu), Pesanan (Terima/Tolak, refund manual, booking ulang, label pengiriman, simulasi status), notifikasi lonceng real-time (SSE), Stok (stok masuk, opname, transfer, batas menipis, kartu stok), Laporan penjualan/laba setelah MDR/stok + CSV, Pengaturan Toko (dengan pratinjau perubahan harga), Kategori (markup per kategori), Kurir, Produk (harga promo berperiode, editor deskripsi, duplikasi, impor/ekspor CSV), Staf per gudang.
- Pengiriman: booking Biteship otomatis setelah lunas/diterima, webhook status, rekonsiliasi tiap 2 jam, Selesai otomatis saat `delivered`, retur mengembalikan stok.
- Rilis: `docs/DEPLOY.md` (server, DNS, SSL, SPF/DKIM/DMARC, Google OAuth, PSE, Biteship & BatPay production), `deploy/` (Nginx, PM2, backup & uji restore — sudah diuji lokal), `docs/UAT.md` (skenario demo ke pemilik).

**Lanjut berikutnya:**
1. **Presentasi/UAT ke pemilik** pakai `docs/UAT.md` (catat temuan di tabel UAT).
2. Setelah disetujui: top up saldo Biteship → `BITESHIP_MOCK_RATES=false`, `BITESHIP_MOCK_ORDERS=false`, daftarkan webhook Biteship; daftar merchant BatPay Ortic.
3. Go-live sesuai `docs/DEPLOY.md` bagian 10.

**Yang perlu diingat:**
- Ongkir **dan booking kurir** masih **simulasi** (`BITESHIP_MOCK_RATES=true`, `BITESHIP_MOCK_ORDERS=true`). Di dashboard, pesanan bisa dimajukan statusnya dengan tombol "Simulasi status berikutnya".
- BatPay = akun **sandbox kesan-invitation** (`sg-openapi.batbiz.id`). Untuk demo tanpa membayar: jalankan API dengan `PAYMENT_PROVIDER=mock`.
- Stok showcase diisi `npm run db:seed:demo-stock --workspace @ortic/api` (development saja). Foto produk masih ilustrasi.
- Booking kurir butuh **nomor HP PIC gudang** (atau WhatsApp toko di Pengaturan Toko); kalau kosong, booking gagal dan muncul di dashboard.
- Pesanan dikirim dari **satu gudang**; keranjang yang stoknya tersebar di dua gudang diminta dipisah (pecah paket otomatis ditunda).
- Batas OTP 5 kode/jam per email: saat banyak uji coba login, tunggu atau pakai akun lain.
- Akun dev (OTP `123456`): `owner@ortic.test` (Owner), `staff@ortic.test` (Staf), `buyer@ortic.test` (Pembeli). Jalankan: `npm run dev` di folder `ortic` → API 4000, toko 5600, admin 5700.

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
| [x] | Produk lanjutan: markup per kategori, harga promo berperiode, editor teks kaya, impor/ekspor CSV, duplikasi produk, pratinjau perubahan markup global | api, admin | Markup varian → produk → kategori → global. Promo = `sale_price` varian + periode produk. Deskripsi HTML dibersihkan server (`sanitize-html`). CSV per varian, dicocokkan lewat SKU, selalu pratinjau (dry run) dulu |
| [x] | Stok per gudang + kartu stok + transfer antar gudang | api, admin | Menu Stok: stok masuk, stok opname, transfer, batas menipis, kartu stok. Tersedia = fisik − dipesan. Notifikasi stok menipis |
| [x] | Pengaturan toko (markup global, pembulatan, biaya layanan, berat kemasan) | api, admin | + asuransi wajib, kontak toko, email notifikasi. Ubah markup/pembulatan menampilkan pratinjau harga lalu menghitung ulang varian yang tidak dikunci |
| [x] | Manajemen kurir (aktif/nonaktif, layanan) | api, admin | Maks. 3 kurir aktif (Biteship Starter), pilihan layanan per kurir |
| [x] | Katalog toko: daftar produk per kategori, pencarian, detail produk | api, web | `GET /catalog/products`, `GET /catalog/products/:slug`; halaman `/produk`, `/kategori/:slug`, `/produk/:slug`, `/bantuan`. Stok belum ditampilkan (menunggu fitur stok) |
| [x] | Keranjang di browser (tamu bisa isi) | web | `localStorage`; harga & berat dihitung ulang server saat checkout |
| [x] | Profil pembeli: nomor WhatsApp, profesi | api, web | `PATCH /auth/me`; dipakai mengisi alamat baru |

### Fase 2 — Transaksi (minggu 3–4)

| Status | Fitur | Aplikasi | Catatan |
| --- | --- | --- | --- |
| [x] | Alamat pembeli (Biteship Maps) | api, web | `/me/addresses` (CRUD, alamat utama), pilih kecamatan via pencarian area Biteship di form checkout |
| [x] | Keranjang server-side + batas stok | api, web | `/cart`; tamu tetap localStorage lalu digabung saat login; jumlah dibatasi stok |
| [x] | Cek ongkir Biteship + alokasi gudang | api, web | Gudang yang stoknya lengkap, ongkir termurah; cache ongkir 24 jam. Keranjang yang tersebar di 2 gudang diminta dipisah (pecah paket otomatis ditunda). Ongkir masih simulasi |
| [x] | Checkout + reservasi stok | api, web | Stok dipesan saat checkout (baris dikunci), dipotong saat lunas, dilepas saat batal/kedaluwarsa. Wajib centang S&K |
| [x] | Pembayaran QRIS BatPay + callback + job kedaluwarsa | api, web | Sandbox BatPay (akun kesan-invitation, sementara). Status: callback (aktif) + Check Status `qr-mpm-query` sesuai dokumentasi BatBiz (polling & job). Pesanan batal/kedaluwarsa → QR dibatalkan di BatPay (`qr-mpm-cancel`) |
| [x] | Halaman bayar (QR, hitung mundur, polling 3 detik) | web | `/pesanan/:code`: QR, simpan QR, batal, status lunas otomatis |

### Fase 3 — Fulfillment (minggu 5–6)

| Status | Fitur | Aplikasi | Catatan |
| --- | --- | --- | --- |
| [x] | Konfirmasi pesanan: `AUTO_ACCEPT_ORDERS` + Terima/Tolak + refund manual | api, admin | Menu Pesanan. Tolak sebelum dijemput: booking dibatalkan, stok kembali, refund tertunda → "Tandai sudah direfund" |
| [x] | Booking Biteship terjadwal + resi + label | api, admin | Otomatis saat Diproses (slot pickup gudang, Minggu → Senin), dicoba ulang otomatis bila gagal, tombol booking ulang, label cetak. Sementara resi simulasi (`BITESHIP_MOCK_ORDERS`) |
| [x] | Webhook Biteship + pemetaan status + Selesai saat `delivered` | api | `POST /webhooks/biteship` (header signature). Retur → Dikembalikan + stok kembali; batal/ditolak kurir → Perlu tindakan |
| [x] | Rekonsiliasi tracking tiap 2 jam | api | `jobs/shipment.job.ts` (tiap 5 menit, per pesanan maks. sekali per 2 jam) |
| [x] | Notifikasi admin (SSE + email) dan email pembeli | api, admin, web | Lonceng + toast real-time; email Owner saat pesanan lunas; email pembeli: lunas, dikirim, selesai, ditolak, refund |
| [x] | Riwayat & detail pesanan pembeli | web | `/pesanan`, `/pesanan/:code` + kartu pengiriman (resi, kurir) dan riwayat |
| [x] | Laporan penjualan, laba (setelah MDR), stok | api, admin | Laba kotor = barang − harga dasar + biaya layanan − MDR (hanya Owner). Ekspor CSV pesanan |

### Fase 4 — Uji & rilis (minggu 7–8)

| Status | Fitur | Catatan |
| --- | --- | --- |
| [x] | Halaman S&K, Kebijakan Privasi, Kebijakan Retur | `/syarat-ketentuan`, `/kebijakan-privasi`, `/kebijakan-retur`; perlu ditinjau pemilik sebelum go-live |
| [ ] | Akun merchant BatPay Ortic + kredensial production | dibuat terpisah saat production. Sekarang memakai akun **sandbox** kesan-invitation (`sg-openapi.batbiz.id`); callback merchant ini terdaftar ke server kesan-invitation, jadi status dicek lewat Check Status (`qr-mpm-query`). Endpoint callback Ortic tetap aktif untuk akun Ortic nanti |
| [ ] | Akun Biteship production + saldo + 2 lokasi asal | ditunda sampai setelah presentasi ke pemilik; langkah di `docs/DEPLOY.md` §6 |
| [~] | Domain ortic.id, admin.ortic.id, api.ortic.id, SSL, email SPF/DKIM/DMARC | konfigurasi Nginx + panduan DNS/SSL/email siap (`deploy/nginx`, `docs/DEPLOY.md` §3–4); tinggal dieksekusi di server |
| [~] | Google OAuth consent screen terverifikasi | langkah di `docs/DEPLOY.md` §5 (butuh halaman privasi yang sudah tayang) |
| [~] | Pendaftaran PSE Lingkup Privat (Komdigi) | langkah di `docs/DEPLOY.md` §8 (butuh NIB pemilik) |
| [x] | Backup DB harian + uji restore | `deploy/scripts/backup-db.sh` (cron) + `restore-test.sh`, diuji lokal 20 Okt 2026; tinggal pasang cron di server |
| [~] | UAT bersama pemilik + input produk awal | skenario siap di `docs/UAT.md`; produk awal bisa diinput lewat impor CSV |

---

## 2. Keputusan yang sudah ditetapkan

| Topik | Keputusan |
| --- | --- |
| Domain | ortic.id (toko), admin.ortic.id (dashboard), api.ortic.id (backend) |
| Pengiriman | Hanya Biteship: cek ongkir, booking, pickup, resi, tracking, webhook |
| Kurir awal | JNE, J&T, SiCepat (batas 3 kurir paket Biteship Starter) |
| Pembayaran | QRIS dinamis BatPay Open API (Batbiz), modul dari kesan-invitation |
| Akun merchant BatPay | Diurus belakangan; development memakai sandbox kesan-invitation (atau `PAYMENT_PROVIDER=mock`) |
| MDR QRIS | Ditanggung pemilik. Default UMI: 0% untuk transaksi ≤ Rp100.000, 0,3% di atasnya (`QRIS_MDR_RATE`, `QRIS_MDR_FREE_MAX`) |
| Gudang | Medan dan Pekanbaru sejak MVP. Seed hanya Gudang Pekanbaru (Villa Mas Permai, Pekanbaru, Riau); alamat lengkap, koordinat, area Biteship, PIC diisi admin. Gudang Medan ditambah admin. Jakarta/Bogor menyusul. |
| Konfirmasi pesanan | `AUTO_ACCEPT_ORDERS=true` (default) langsung diproses; `false` admin wajib klik Terima. Admin selalu bisa Tolak sebelum pickup. |
| Katalog & harga | Diisi admin. Harga jual = harga dasar (termurah di marketplace) × (1 + markup 5%), dibulatkan ke atas Rp500; bisa dikunci manual |
| Biaya ke pembeli | Ongkir + asuransi (opsional, wajib > Rp1 jt) + biaya layanan Rp1.000/paket |
| Logo | Dibuat baru dari avatar Instagram (`assets/brand/`), **disetujui** 20 Okt 2026 |
| Foto produk | Sementara ilustrasi |
| Alokasi gudang | Satu pesanan = satu gudang (stok lengkap, ongkir termurah). Pecah otomatis 2 paket ditunda |
| Biteship & BatPay production | Setelah presentasi ke pemilik; sampai saat itu ongkir & booking simulasi, QRIS sandbox kesan-invitation |
| Tema | Biru #1438C8 (utama), kuning #FFD21F (aksi), merah #D7192A (promo); Bangers (judul) + Poppins (teks); gaya poster komik |
| Tech stack | Sama dengan kesan-invitation: npm workspaces + Turborepo; Express 5 + TypeScript + Drizzle + MySQL 8 + Zod + jose + pino; Vue 3 + Vite + Nuxt UI v4 + Tailwind v4 + Pinia + TanStack Query + valibot + vue-i18n |
| Ditunda | Harga grosir/klinik, COD, gudang Jakarta/Bogor, pecah paket otomatis antar gudang |

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
- Katalog & belanja: `GET /catalog/products`, `/catalog/products/:slug`, `/catalog/store`; `/me/addresses`; `GET|PUT|DELETE /cart`, `PUT /cart/items`, `POST /cart/merge`; `POST /checkout/quote`, `POST /checkout`; `GET /orders`, `/orders/:code`, `POST /orders/:code/cancel`
- Admin pesanan: `GET /admin/orders`, `/admin/orders/:code`, `POST .../accept|reject|refund|book-shipment|simulate-shipping`
- Admin stok: `GET /admin/stocks`, `/admin/stocks/movements`, `POST /admin/stocks/adjust|transfer`, `PATCH /admin/stocks/threshold`
- Admin lain: `/admin/settings` (+ `pricing-preview`), `/admin/categories` (+ `markup-preview`), `/admin/couriers`, `/admin/notifications` (+ `read`, `stream` SSE), `/admin/dashboard`, `/admin/reports/sales|stock|orders.csv`, `/admin/products/:id/duplicate`, `/admin/products/export.csv`, `/admin/products/import`, `PATCH /admin/users/:id/warehouse`
- Webhook: `POST /webhooks/biteship`, BatPay `/webhooks/batpay/v1.0/*`

## 7. Pertanyaan terbuka

- [x] Logo baru di `assets/brand/` disetujui (20 Okt 2026)
- [x] Akun Biteship + API key sandbox (sudah di `apps/api/.env`)
- [ ] Top up saldo Biteship (setelah presentasi ke pemilik): API ongkir (`/v1/rates/couriers`) menolak dengan "No sufficient balance" walau memakai key test (masih sama setelah KYC). Sementara pakai `BITESHIP_MOCK_RATES=true`; set `false` setelah top up
- [ ] Pendaftaran akun merchant BatPay Ortic (belakangan, sebelum go-live; endpoint callback Ortic sudah siap)
- [ ] Kode pos & koordinat pasti gudang Villa Mas Permai (sementara area Rumbai 28261)
- [ ] Foto produk asli untuk menggantikan ilustrasi showcase (sementara ilustrasi, disetujui)
- [ ] Teks S&K, Kebijakan Privasi, Kebijakan Retur ditinjau pemilik
- [ ] Nomor HP PIC & jam pickup tiap gudang (wajib untuk booking kurir)

---

## Changelog

### 2026-10-20
- Perbaikan hasil uji: (1) pesanan yang tersimpan tanpa QRIS (API berhenti di tengah checkout) kini dibuatkan QRIS baru saat dibuka, web menampilkan "Menyiapkan kode QRIS…"; (2) status pembayaran di daftar & detail pesanan (pembeli dan admin, termasuk jumlah per status) selalu sama: disinkronkan ke BatPay dan QR kedaluwarsa langsung dibatalkan (tanpa jeda 2 menit; pembayaran terlambat tetap diterima); (3) admin: tombol aksi pesanan & banner beranda tidak lagi hilang saat layar di-zoom.
- Fase 1–3 diselesaikan + persiapan Fase 4 (branch `feat/complete-mvp`). Migration `0003_fulfillment_stock_cart` (stok pesanan, refund, pengiriman Biteship, riwayat pesanan, keranjang server, notifikasi, harga promo, markup kategori, harga dasar di baris pesanan) dan `0004_audit_user_warehouse`.
- Stok per gudang: reservasi saat checkout, potong saat lunas, lepas saat batal/kedaluwarsa, kembali saat ditolak/retur (`orders.stock_state`, compare-and-set). Admin: stok masuk, opname, transfer, batas menipis, kartu stok, notifikasi stok menipis. Seeder `db:seed:demo-stock` untuk showcase.
- Checkout: alokasi gudang (stok lengkap + ongkir termurah), cache ongkir 24 jam, keranjang server + gabung keranjang tamu, harga promo, centang S&K.
- Pengiriman: booking Biteship terjadwal otomatis (mock `BITESHIP_MOCK_ORDERS` dengan simulasi status), booking ulang otomatis/manual, webhook `/webhooks/biteship`, rekonsiliasi 2 jam, Selesai saat `delivered`, label pengiriman.
- Admin: Pesanan (Terima/Tolak/refund), lonceng notifikasi SSE, beranda KPI, laporan penjualan/laba/stok + CSV, Pengaturan Toko (pratinjau harga), Kategori (markup), Kurir, produk lanjutan (promo berperiode, editor deskripsi, duplikasi, impor/ekspor CSV), Staf per gudang.
- Toko: stok & promo di katalog, kartu pengiriman + riwayat pesanan, profil WhatsApp/profesi, halaman S&K/Privasi/Retur, kontak toko di footer.
- Email pesanan (pembeli & Owner). Rilis: `docs/DEPLOY.md`, `docs/UAT.md`, `deploy/` (Nginx, PM2, backup + uji restore, diuji lokal).
- Keputusan: logo disetujui; foto ilustrasi dipakai dulu; saldo Biteship & merchant BatPay setelah presentasi ke pemilik; satu pesanan = satu gudang. PRD HTML/PDF v2.2.

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
