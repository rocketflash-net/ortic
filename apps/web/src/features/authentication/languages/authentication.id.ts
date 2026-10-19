export default {
  feature_title: "Autentikasi",

  layout: {
    brand: "Ortic",
    back_to_store: "Kembali ke toko",
    headline: "A place to shop a better smile",
    tagline: "Masuk untuk belanja alat kedokteran gigi, bayar dengan QRIS, dan lacak pesanan Anda.",
  },

  callback: {
    title: "Menyelesaikan login…",
    description: "Sebentar, kami sedang memproses login Google Anda.",
  },

  login: {
    page_title: "Masuk",
    page_description: "Masuk atau daftar untuk mulai belanja",
    google_button: "Lanjutkan dengan Google",
    divider: "atau dengan email",
    email: {
      label: "Email",
      placeholder: "nama{'@'}email.com",
      invalid: "Masukkan alamat email yang valid",
      send_code: "Kirim kode masuk",
    },
    code: {
      label: "Kode masuk",
      sent_to: "Kami mengirim kode 6 digit ke {email}. Cek juga folder spam.",
      verify: "Masuk",
      resend: "Kirim ulang kode",
      resend_in: "Kirim ulang dalam {seconds} detik",
      change_email: "Ganti email",
    },
    in_app: {
      title: "Buka di browser untuk masuk dengan Google",
      description:
        "Google tidak mengizinkan login dari browser di dalam aplikasi (Instagram, TikTok, Facebook, dll). Buka halaman ini di Chrome atau Safari, atau masuk dengan email di bawah.",
      open_chrome: "Buka di Chrome",
      copy_link: "Salin link",
      copied: "Link disalin. Tempel di Chrome atau Safari.",
    },
    errors: {
      access_denied: "Login Google dibatalkan.",
      account_conflict:
        "Email ini sudah terhubung ke akun Google lain. Masuk dengan akun Google tersebut atau hubungi kami.",
      google_login_failed: "Login Google gagal. Coba lagi atau masuk dengan email.",
      invalid_login_code: "Kode salah atau sudah kedaluwarsa. Minta kode baru jika perlu.",
      too_many_requests: "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.",
      generic: "Terjadi kesalahan. Coba lagi.",
    },
  },
};
