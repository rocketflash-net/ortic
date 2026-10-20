# Skenario demo & UAT bersama pemilik

Dipakai saat presentasi ke pemilik (Owner) sebelum go-live. Semua langkah bisa dijalankan di lokal dengan data showcase; ongkir, booking kurir, dan perjalanan paket memakai **mode simulasi** (`BITESHIP_MOCK_RATES=true`, `BITESHIP_MOCK_ORDERS=true`) sampai saldo Biteship diisi.

## Persiapan (sekali)

```bash
cd ortic
npm run db:migrate --workspace @ortic/api
npm run db:seed:demo-stock --workspace @ortic/api   # stok awal showcase di Gudang Pekanbaru
npm run dev                                         # API 4000, toko 5600, admin 5700
```

- Pembayaran QRIS: akun **sandbox** BatPay kesan-invitation (bisa dibayar dari simulator sandbox). Untuk demo tanpa membayar, jalankan API dengan `PAYMENT_PROVIDER=mock` lalu klik "Simulasi bayar" di halaman pesanan.
- Akun: `buyer@ortic.test` (toko, OTP `123456`), `owner@ortic.test` dan `staff@ortic.test` (dashboard).

## A. Pembeli (http://localhost:5600)

| # | Langkah | Hasil yang diharapkan | OK |
| --- | --- | --- | --- |
| A1 | Buka beranda, pilih kategori, cari "tang" | Produk tampil dengan harga; produk habis bertanda "Stok habis" | [ ] |
| A2 | Buka detail produk, pilih varian | Jumlah maksimal sesuai stok; harga coret + label Promo bila ada promo | [ ] |
| A3 | Tambah ke keranjang sebagai tamu, lalu Masuk (OTP) | Isi keranjang tamu digabung ke keranjang akun | [ ] |
| A4 | Akun → isi nomor WhatsApp & profesi | Tersimpan | [ ] |
| A5 | Checkout: pilih alamat, kurir, centang S&K | Muncul "Dikirim dari Gudang Pekanbaru", ongkir per kurir (simulasi) | [ ] |
| A6 | Bayar QRIS (atau Simulasi bayar) | Status "Pembayaran berhasil" → Diproses, stok berkurang | [ ] |
| A7 | Buka Pesanan → detail | Resi muncul (kurir dibooking otomatis), riwayat pesanan | [ ] |
| A8 | Buka halaman Syarat & Ketentuan, Privasi, Retur dari footer | Tampil, kontak toko benar | [ ] |

## B. Owner / Staf (http://localhost:5700)

| # | Langkah | Hasil yang diharapkan | OK |
| --- | --- | --- | --- |
| B1 | Beranda dashboard | Penjualan hari ini, 7 hari, pekerjaan menunggu, stok menipis | [ ] |
| B2 | Lonceng notifikasi saat A6 terjadi | Notifikasi "Pesanan baru lunas" muncul tanpa refresh | [ ] |
| B3 | Pesanan → buka pesanan dari A6 | Detail lengkap: barang, pembeli, alamat, pembayaran + MDR, resi, riwayat | [ ] |
| B4 | Klik "Simulasi status berikutnya" beberapa kali | Menunggu pickup → Dikirim → **Selesai** otomatis saat paket diterima; pembeli melihat riwayat yang sama | [ ] |
| B5 | Cetak label pengiriman | Label siap cetak (pengirim, penerima, kurir, resi) | [ ] |
| B6 | Buat pesanan baru (A5–A6), lalu Tolak dengan alasan | Booking kurir dibatalkan, stok kembali, status refund "tertunda" | [ ] |
| B7 | Tandai sudah direfund | Refund selesai tercatat, pembeli menerima email | [ ] |
| B8 | Stok → Stok masuk, Stok opname, Transfer ke Medan, Kartu stok | Angka & kartu stok berubah sesuai, tercatat siapa yang mengubah | [ ] |
| B9 | Produk → ubah harga promo + periode; Duplikat; Ekspor/Impor CSV | Harga promo tampil di toko selama periode; impor menampilkan pratinjau dulu | [ ] |
| B10 | Pengaturan Toko → ubah markup 5% → 6% | Pratinjau jumlah varian yang berubah sebelum disimpan | [ ] |
| B11 | Kategori → markup khusus kategori; Kurir → nonaktifkan layanan | Harga & pilihan kurir di checkout ikut berubah | [ ] |
| B12 | Laporan → Penjualan (periode, CSV) dan Stok | Omzet, MDR, laba kotor, produk terlaris; nilai stok per gudang | [ ] |
| B13 | Login sebagai Staf | Tidak melihat harga dasar, laba, pengaturan toko | [ ] |
| B14 | (opsional) Set `AUTO_ACCEPT_ORDERS=false`, ulangi A6 | Pesanan masuk "Menunggu konfirmasi", admin klik Terima → kurir dibooking | [ ] |

## C. Keputusan yang perlu dari pemilik

- [ ] Biaya layanan Rp1.000/paket dan markup 5% sudah sesuai?
- [ ] Kebijakan retur (2×24 jam, video unboxing, barang steril tidak bisa retur kecuali cacat/salah kirim) disetujui?
- [ ] Jam pickup gudang (default 13.00 WIB) dan nomor HP PIC tiap gudang.
- [ ] Email penerima notifikasi pesanan baru (Pengaturan Toko).
- [ ] Jadwal top up saldo Biteship & pendaftaran merchant BatPay Ortic.
- [ ] Foto produk asli (saat ini ilustrasi).

Catatan temuan UAT:

| # | Temuan | Prioritas | Status |
| --- | --- | --- | --- |
| | | | |
