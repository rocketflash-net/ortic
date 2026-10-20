# Panduan rilis Ortic ID (production)

Dokumen ini berisi langkah go-live dan checklist yang harus dikerjakan **di luar kode** (akun, domain, legal). Bagian yang sudah disiapkan di repo: konfigurasi Nginx (`deploy/nginx/ortic.conf`), PM2 (`deploy/ecosystem.config.cjs`), backup & uji restore (`deploy/scripts/`).

Status per item ada di `docs/PRD.md` Fase 4. Tandai di sana saat selesai.

---

## 1. Server

Rekomendasi awal: 1 VPS Jakarta (2 vCPU, 2–4 GB RAM, Ubuntu 24.04), MySQL 8 di server yang sama, file foto di Cloudflare R2.

```bash
# Paket dasar
sudo apt update && sudo apt install -y nginx mysql-server certbot python3-certbot-nginx git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2
sudo mkdir -p /srv/ortic /var/log/ortic /var/backups/ortic

# Database
sudo mysql -e "CREATE DATABASE ortic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER 'ortic'@'localhost' IDENTIFIED BY '<password-kuat>';
  GRANT ALL ON ortic.* TO 'ortic'@'localhost';"

# Kode
git clone <repo> /srv/ortic && cd /srv/ortic
cp apps/api/.env.example apps/api/.env      # isi (lihat bagian 2)
cp apps/web/.env.example apps/web/.env      # VITE_API_BASE_URL=https://api.ortic.id/api/v1
cp apps/admin/.env.example apps/admin/.env  # VITE_API_BASE_URL=https://api.ortic.id/api/v1
npm ci && npm run build
npm run db:migrate:prod --workspace @ortic/api
npm run db:seed --workspace @ortic/api      # gudang, kurir, pengaturan, kategori (idempoten)
npm run admin:prod --workspace @ortic/api -- grant <email-owner> superadmin

pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup
sudo cp deploy/nginx/ortic.conf /etc/nginx/sites-available/ && sudo ln -s /etc/nginx/sites-available/ortic.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d ortic.id -d www.ortic.id -d admin.ortic.id -d api.ortic.id
```

Update versi berikutnya: `git pull && npm ci && npm run build && npm run db:migrate:prod --workspace @ortic/api && pm2 reload ortic-api`.

> Jangan menjalankan `npm run db:seed:demo-stock` di production (stok demo; script menolak `NODE_ENV=production`).

## 2. Isi `.env` API production

Wajib berbeda dari development:

| Variabel | Nilai production |
| --- | --- |
| `NODE_ENV` | `production` (validasi env menolak konfigurasi dev) |
| `WEB_URL` / `ADMIN_URL` | `https://ortic.id` / `https://admin.ortic.id` |
| `JWT_SECRET` | acak ≥ 32 karakter |
| `AUTH_DEV_LOGIN_CODE` | **kosong** (ditolak di production) |
| `MAIL_PROVIDER` | `smtp` atau `onesignal` (`log` ditolak) + `MAIL_FROM="Ortic <no-reply@ortic.id>"` |
| `PAYMENT_PROVIDER` | `batpay` + kredensial **akun merchant Ortic** & `BATPAY_BASE_URL=https://openapi.batbiz.id` |
| `BITESHIP_API_KEY` | key **live** dari dashboard Biteship |
| `BITESHIP_MOCK_RATES` / `BITESHIP_MOCK_ORDERS` | `false` (mock ditolak di production) |
| `BITESHIP_WEBHOOK_SECRET` | acak, sama dengan "Signature Secret" di dashboard Biteship |
| `STORAGE_DRIVER` | `s3` + kredensial R2, `STORAGE_PUBLIC_URL` domain publik bucket |
| `AUTO_ACCEPT_ORDERS` | `true` (default) atau `false` bila pemilik ingin cek manual setiap pesanan |
| `TRUST_PROXY` | `1` (di belakang Nginx) |

## 3. Domain & DNS (ortic.id)

Di pengelola DNS (disarankan Cloudflare, proxy **mati/abu-abu** untuk `api` agar SSE & webhook tidak terganggu):

| Tipe | Nama | Isi |
| --- | --- | --- |
| A | `@` | IP VPS |
| A | `www` | IP VPS |
| A | `admin` | IP VPS |
| A | `api` | IP VPS |

SSL: `certbot --nginx` (bagian 1) memasang sertifikat Let's Encrypt dan perpanjangan otomatis (`systemctl list-timers | grep certbot`).

## 4. Email domain (SPF, DKIM, DMARC)

Supaya email OTP & notifikasi pesanan tidak masuk spam. Nilai pasti DKIM diberikan penyedia email (Brevo/Resend/SES/OneSignal) saat menambahkan domain.

| Tipe | Nama | Isi (contoh) |
| --- | --- | --- |
| TXT | `@` | `v=spf1 include:<spf-penyedia> ~all` (mis. `include:spf.brevo.com`) — hanya **satu** record SPF |
| TXT/CNAME | `<selector>._domainkey` | dari penyedia email |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@ortic.id; adkim=s; aspf=s` (mulai dengan `p=none` 1–2 minggu, lalu naikkan) |

Uji: kirim OTP ke Gmail → "Show original" → SPF, DKIM, DMARC harus `PASS`.

## 5. Google OAuth (login Google)

1. Google Cloud Console → APIs & Services → OAuth consent screen: tipe **External**, nama aplikasi "Ortic", logo (`assets/brand/`), email dukungan, domain `ortic.id`.
2. Authorized domains: `ortic.id`. Link wajib: Beranda `https://ortic.id`, Kebijakan Privasi `https://ortic.id/kebijakan-privasi`, S&K `https://ortic.id/syarat-ketentuan`.
3. Scope hanya `openid`, `email`, `profile` (non-sensitive → verifikasi cepat, biasanya 2–5 hari kerja, tanpa audit keamanan).
4. Credentials → OAuth client (Web): redirect URI `https://api.ortic.id/api/v1/auth/google/callback`. Isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
5. Klik "Publish app" lalu "Prepare for verification"; verifikasi kepemilikan domain lewat Google Search Console (record TXT).

## 6. Biteship production

- [ ] Top up saldo (minimal ± Rp500.000; peringatan saldo rendah = pengaturan `biteship_low_balance`).
- [ ] Ganti ke API key live, set `BITESHIP_MOCK_RATES=false`, `BITESHIP_MOCK_ORDERS=false`.
- [ ] Dashboard Biteship → Integrations → Webhook: URL `https://api.ortic.id/api/v1/webhooks/biteship`, Signature Key = `BITESHIP_WEBHOOK_HEADER` (default `x-ortic-webhook-secret`), Signature Secret = `BITESHIP_WEBHOOK_SECRET`. Saat disimpan, Biteship mengirim request percobaan; API membalas 200.
- [ ] Lokasi asal: lengkapi alamat, area Biteship, koordinat, **nomor HP PIC**, dan jam pickup kedua gudang di Dashboard → Gudang (booking kurir gagal bila HP PIC kosong).
- [ ] Uji 1 pesanan nyata nominal kecil: checkout → bayar → resi muncul → status bergerak lewat webhook.

## 7. BatPay (QRIS) production

- [ ] Daftar akun merchant BatPay atas nama Ortic (KTP/NIB pemilik, rekening penampung).
- [ ] Buat key RSA baru (`openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out batpay-private.pem`), unggah public key ke BatPay; simpan public key BatPay production.
- [ ] Daftarkan callback: auth `https://api.ortic.id/api/v1/webhooks/batpay/v1.0/access-token/b2b`, notify `https://api.ortic.id/api/v1/webhooks/batpay/v1.0/qr/qr-mpm-notify`.
- [ ] Isi kredensial `BATPAY_*` production dan `BATPAY_BASE_URL=https://openapi.batbiz.id`. Saat ini development memakai akun **sandbox kesan-invitation**.
- [ ] Cek kategori MDR merchant (UMI 0% ≤ Rp100.000; selain itu sesuaikan `QRIS_MDR_RATE` / `QRIS_MDR_FREE_MAX`).

## 8. PSE Lingkup Privat (Komdigi)

Wajib untuk platform yang memproses data pribadi pengguna di Indonesia (PP 71/2019, Permenkominfo 5/2020).

1. Siapkan NIB (OSS) dengan KBLI perdagangan eceran melalui internet (47911 / sesuai bidang usaha).
2. Daftar di https://pse.komdigi.go.id lewat akun OSS: isi informasi sistem elektronik (nama "Ortic ID", domain `ortic.id`, jenis layanan e-commerce, lokasi server, data pribadi yang diproses: nama, email, nomor HP, alamat).
3. Lampirkan tautan Kebijakan Privasi dan S&K yang sudah tayang.
4. Simpan nomor tanda daftar PSE, tampilkan di footer toko bila sudah terbit.

## 9. Backup database

- Harian (cron 02.00 WIB): `0 2 * * * /srv/ortic/deploy/scripts/backup-db.sh >> /var/log/ortic/backup.log 2>&1`
  - Simpan 14 hari di `/var/backups/ortic` (`BACKUP_KEEP_DAYS`).
  - Salinan offsite: pasang `rclone` ke Cloudflare R2 bucket terpisah lalu set `BACKUP_RCLONE_REMOTE=r2:ortic-backups` di crontab.
- Uji restore bulanan: `deploy/scripts/restore-test.sh` (memulihkan backup terbaru ke database sementara `ortic_restore_test`, menampilkan jumlah baris, lalu menghapusnya). Sudah diuji di lokal pada 20 Oktober 2026.
- Foto produk ada di R2 (versioning bucket diaktifkan di dashboard Cloudflare).

## 10. Checklist hari-H

- [ ] Semua item bagian 2–7 selesai; `NODE_ENV=production` API start tanpa error validasi env.
- [ ] `https://api.ortic.id/health/ready` → `database: up`.
- [ ] Login Google & OTP email berhasil (email OTP masuk inbox, bukan spam).
- [ ] Produk asli diinput, stok awal diisi lewat Dashboard → Stok (stok masuk), harga dicek di Pengaturan Toko.
- [ ] Pesanan uji end-to-end dengan uang asli, lalu tolak & refund untuk menguji alur refund.
- [ ] Cron backup terpasang dan backup pertama terbentuk.
- [ ] Notifikasi dashboard muncul saat pesanan lunas; email pesanan baru masuk ke Owner.
