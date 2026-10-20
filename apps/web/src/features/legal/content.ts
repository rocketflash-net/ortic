import type { StoreInfo } from "@/shared/services/store-info"

import type { LegalPageKey } from "./models"

/** One block of a policy page: heading, paragraphs, and an optional bullet list. */
export type LegalSection = { title: string; paragraphs?: string[]; list?: string[] }

/** Date the texts below were last reviewed (shown on every policy page). */
export const LEGAL_UPDATED_AT = "2026-10-20"

const contactLine = (info: StoreInfo): string => {
  const channels = [
    info.store_whatsapp && `WhatsApp ${info.store_whatsapp}`,
    info.store_email && `email ${info.store_email}`,
    info.store_instagram && `Instagram @${info.store_instagram.replace(/^@/, "")}`,
  ].filter(Boolean)
  return channels.length ? channels.join(", ") : "Instagram @ortic_id"
}

/**
 * Teks kebijakan toko (Bahasa Indonesia). Disusun untuk toko online alat kedokteran gigi yang menjual ke konsumen
 * (UU No. 8/1999 Perlindungan Konsumen, PP 80/2019 PMSE, PP 71/2019 PSTE, UU No. 27/2022 Pelindungan Data Pribadi).
 * Pemilik toko sebaiknya meninjau ulang bersama konsultan hukum sebelum go-live.
 */
export const legalContent = (page: LegalPageKey, info: StoreInfo): LegalSection[] => {
  const store = info.store_name || "Ortic Indonesia"
  const contact = contactLine(info)

  if (page === "terms") {
    return [
      {
        title: "1. Tentang layanan",
        paragraphs: [
          `Situs ortic.id dikelola oleh ${store} ("Ortic", "kami") dan menjual alat serta bahan kedokteran gigi untuk dokter gigi, mahasiswa kedokteran gigi, klinik, dan laboratorium gigi. Dengan membuat akun atau melakukan pemesanan, Anda menyetujui Syarat & Ketentuan ini, Kebijakan Privasi, dan Kebijakan Retur & Refund.`,
        ],
      },
      {
        title: "2. Akun",
        list: [
          "Akun dibuat dengan login Google atau kode OTP yang dikirim ke email Anda. Jaga kerahasiaan akses email Anda; seluruh aktivitas dari akun Anda menjadi tanggung jawab Anda.",
          "Data yang Anda isi (nama, nomor WhatsApp, alamat) harus benar agar pesanan dapat dikirim.",
          "Kami dapat menangguhkan akun yang digunakan untuk penipuan, penyalahgunaan sistem, atau pelanggaran hukum.",
        ],
      },
      {
        title: "3. Produk, harga, dan stok",
        list: [
          "Foto produk dapat berupa ilustrasi; spesifikasi yang berlaku adalah yang tertulis di halaman produk.",
          "Harga dalam Rupiah dan dapat berubah sewaktu-waktu. Harga yang berlaku adalah harga saat pesanan dibuat. Harga promo hanya berlaku selama periode promo yang tertera.",
          "Stok ditampilkan secara langsung. Barang dipesankan untuk Anda selama batas waktu pembayaran; bila tidak dibayar, pesanan dibatalkan otomatis dan stok dilepas.",
          "Produk tertentu (bahan cair/kimia) hanya dapat dikirim dengan kurir yang menerima barang tersebut.",
          "Produk alat kesehatan ditujukan untuk tenaga dan peserta didik kesehatan gigi; pembeli bertanggung jawab atas penggunaan sesuai petunjuk dan kompetensinya.",
        ],
      },
      {
        title: "4. Pemesanan dan pembayaran",
        list: [
          "Total yang dibayar = harga barang + ongkos kirim + asuransi (bila dipilih atau wajib) + biaya layanan. Rinciannya tampil sebelum Anda membayar.",
          "Pembayaran menggunakan QRIS dinamis yang berlaku 15 menit. Pesanan terkonfirmasi otomatis setelah pembayaran diterima; tidak perlu mengirim bukti transfer.",
          "Kami dapat menolak atau membatalkan pesanan yang sudah dibayar bila terjadi kesalahan harga yang nyata, stok fisik rusak/tidak tersedia, atau dugaan penipuan. Dana dikembalikan penuh sesuai Kebijakan Retur & Refund.",
        ],
      },
      {
        title: "5. Pengiriman",
        list: [
          "Pesanan dikirim dari gudang kami (Pekanbaru atau Medan) melalui kurir rekanan Biteship (JNE, J&T, SiCepat). Perkiraan waktu kirim berasal dari kurir dan bukan jaminan.",
          "Nomor resi dan status pengiriman tampil di halaman Pesanan. Pesanan dianggap selesai ketika kurir mencatat paket telah diterima.",
          "Asuransi pengiriman wajib untuk nilai barang di atas batas yang tertera saat checkout. Klaim kerusakan/kehilangan di perjalanan mengikuti ketentuan kurir dan asuransinya; kami membantu proses klaim.",
          "Pastikan alamat dan nomor penerima benar. Biaya pengiriman ulang akibat alamat yang salah menjadi tanggung jawab pembeli.",
        ],
      },
      {
        title: "6. Retur dan refund",
        paragraphs: ["Pengembalian barang dan dana diatur dalam Kebijakan Retur & Refund yang merupakan bagian dari Syarat & Ketentuan ini."],
      },
      {
        title: "7. Batas tanggung jawab",
        paragraphs: [
          "Sepanjang diizinkan hukum, tanggung jawab kami atas suatu pesanan paling besar sejumlah nilai pesanan tersebut. Kami tidak bertanggung jawab atas kerugian akibat penggunaan produk yang tidak sesuai petunjuk, atau keterlambatan yang disebabkan kurir, bencana, atau keadaan kahar.",
        ],
      },
      {
        title: "8. Hukum dan penyelesaian sengketa",
        paragraphs: [
          "Syarat & Ketentuan ini tunduk pada hukum Republik Indonesia. Keluhan diselesaikan terlebih dahulu secara musyawarah melalui kontak di bawah. Bila tidak tercapai kesepakatan, para pihak dapat menempuh penyelesaian melalui Badan Penyelesaian Sengketa Konsumen (BPSK) atau pengadilan negeri yang berwenang.",
        ],
      },
      {
        title: "9. Perubahan dan kontak",
        paragraphs: [
          "Kami dapat memperbarui Syarat & Ketentuan ini; versi terbaru selalu tersedia di halaman ini dan berlaku untuk pesanan setelah tanggal pembaruan.",
          `Pertanyaan dan keluhan: ${contact}.${info.store_address ? ` Alamat: ${info.store_address}.` : ""}`,
        ],
      },
    ]
  }

  if (page === "privacy") {
    return [
      {
        title: "1. Pengendali data",
        paragraphs: [
          `${store} adalah pengendali data pribadi yang Anda berikan di ortic.id, sebagaimana dimaksud dalam UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) dan PP No. 71 Tahun 2019 tentang Penyelenggaraan Sistem dan Transaksi Elektronik.`,
        ],
      },
      {
        title: "2. Data yang kami kumpulkan",
        list: [
          "Data akun: nama, email, foto profil Google (bila login dengan Google), profesi (opsional).",
          "Data pengiriman: nama dan nomor WhatsApp penerima, alamat, kecamatan, kode pos, dan catatan alamat.",
          "Data transaksi: isi pesanan, nominal, status pembayaran QRIS, nomor resi dan riwayat pengiriman. Kami tidak menerima atau menyimpan data kartu, rekening, maupun PIN aplikasi pembayaran Anda.",
          "Data teknis: alamat IP, jenis perangkat, dan log akses untuk keamanan dan pencegahan penipuan. Keranjang tamu disimpan di penyimpanan browser Anda.",
        ],
      },
      {
        title: "3. Tujuan pemrosesan",
        list: [
          "Membuat dan mengamankan akun, termasuk mengirim kode login.",
          "Memproses pesanan, pembayaran, pengiriman, retur, dan refund.",
          "Mengirim informasi terkait pesanan (email/WhatsApp) dan menanggapi pertanyaan Anda.",
          "Memenuhi kewajiban hukum, pembukuan, dan perpajakan.",
        ],
        paragraphs: [
          "Dasar pemrosesan adalah pelaksanaan perjanjian jual beli dengan Anda, kewajiban hukum, dan persetujuan Anda. Kami tidak menjual data pribadi Anda.",
        ],
      },
      {
        title: "4. Pihak yang menerima data",
        list: [
          "Penyedia pembayaran QRIS (BatPay/Batbiz) untuk membuat dan memverifikasi pembayaran.",
          "Biteship dan kurir (JNE, J&T, SiCepat) untuk menghitung ongkir, menjemput, dan mengantar paket: nama, nomor, dan alamat penerima.",
          "Google (bila Anda memilih login dengan Google) serta penyedia email, server, dan penyimpanan yang kami gunakan untuk menjalankan layanan.",
          "Instansi berwenang bila diwajibkan oleh peraturan perundang-undangan.",
        ],
      },
      {
        title: "5. Penyimpanan dan keamanan",
        paragraphs: [
          "Data disimpan di server dengan koneksi terenkripsi (HTTPS) dan akses terbatas pada staf yang berwenang. Data transaksi disimpan selama diperlukan untuk tujuan di atas dan sesuai kewajiban pembukuan (umumnya 10 tahun); data akun dihapus atau dianonimkan setelah permintaan penghapusan, kecuali yang wajib disimpan menurut hukum.",
          "Bila terjadi kegagalan pelindungan data pribadi, kami akan memberi tahu Anda dan otoritas terkait paling lambat 3 x 24 jam sesuai UU PDP.",
        ],
      },
      {
        title: "6. Hak Anda",
        list: [
          "Mengakses dan memperoleh salinan data pribadi Anda.",
          "Memperbaiki data yang tidak akurat (sebagian bisa langsung di halaman Akun dan buku alamat).",
          "Menarik persetujuan, membatasi pemrosesan, atau meminta penghapusan akun dan data.",
          "Mengajukan keberatan atau pengaduan.",
        ],
        paragraphs: [
          `Ajukan permintaan melalui ${contact}. Kami menanggapi paling lambat 3 x 24 jam sejak permintaan diterima dan dapat meminta verifikasi identitas.`,
        ],
      },
      {
        title: "7. Cookie dan penyimpanan browser",
        paragraphs: ["Kami memakai penyimpanan browser (localStorage) untuk keranjang tamu dan token login. Kami tidak memakai cookie iklan pihak ketiga."],
      },
      {
        title: "8. Perubahan kebijakan",
        paragraphs: ["Perubahan kebijakan ini diumumkan di halaman ini dengan tanggal pembaruan terbaru."],
      },
    ]
  }

  return [
    {
      title: "1. Barang yang dapat diretur",
      list: [
        "Barang yang diterima rusak, cacat produksi, tidak berfungsi, salah kirim (jenis/varian/jumlah), atau tidak sesuai deskripsi.",
        "Pengajuan paling lambat 2 x 24 jam sejak paket tercatat diterima oleh kurir.",
        "Wajib menyertakan video unboxing tanpa jeda (sejak paket masih tersegel hingga isi terlihat), foto label pengiriman, dan foto barang/kerusakannya.",
        "Barang dikembalikan lengkap dengan kemasan, aksesori, buku manual, dan bonus (bila ada), dalam kondisi belum dipakai kecuali untuk mencoba fungsi.",
      ],
    },
    {
      title: "2. Barang yang tidak dapat diretur",
      list: [
        "Barang steril dan habis pakai yang segelnya sudah dibuka (mis. kasa steril, sarung tangan, masker, jarum, bur sekali pakai, gutta percha, bahan cetak) — kecuali cacat atau salah kirim.",
        "Bahan cair/kimia (mis. alkohol, cairan irigasi, bahan restorasi) yang sudah dibuka.",
        "Kerusakan karena pemakaian, perawatan yang tidak sesuai petunjuk, atau jatuh setelah diterima.",
        "Perubahan pikiran (salah pilih ukuran/varian oleh pembeli), kecuali disetujui toko; ongkos kirim pulang-pergi ditanggung pembeli.",
      ],
    },
    {
      title: "3. Cara mengajukan retur",
      list: [
        `Hubungi kami melalui ${contact} dengan menyebut kode pesanan (ORT-…), kendala, serta lampiran video dan foto.`,
        "Kami meninjau pengajuan paling lambat 2 x 24 jam kerja dan memberi instruksi pengiriman balik bila disetujui.",
        "Untuk retur karena kesalahan kami (cacat, salah kirim), ongkos kirim balik kami tanggung.",
        "Setelah barang kami terima dan periksa, Anda dapat memilih penggantian barang yang sama (bila stok tersedia) atau refund.",
      ],
    },
    {
      title: "4. Refund",
      list: [
        "Refund diberikan untuk retur yang disetujui, pesanan lunas yang dibatalkan toko, atau paket yang hilang/dikembalikan kurir.",
        "Refund dilakukan manual melalui transfer bank atau e-wallet atas nama pembeli, dalam 3–7 hari kerja setelah data rekening kami terima.",
        "Nilai refund: harga barang yang diretur. Ongkos kirim dan biaya layanan ikut dikembalikan bila seluruh pesanan dibatalkan karena kesalahan toko.",
        "Status refund dapat dilihat di halaman detail pesanan.",
      ],
    },
    {
      title: "5. Paket rusak atau hilang di perjalanan",
      paragraphs: [
        "Bila paket tiba dalam kondisi rusak, rekam video unboxing dan laporkan dalam 2 x 24 jam. Untuk paket berasuransi, kami membantu klaim ke kurir; refund atau penggantian diberikan setelah klaim diproses. Paket yang hilang menurut kurir akan kami ganti atau refund penuh.",
      ],
    },
  ]
}
