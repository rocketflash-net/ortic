import { env, envBoolean, envNumber } from "@config/env.config";

const orderConfig = {
  // true (default): pesanan yang lunas langsung diproses (booking Biteship).
  // false: pesanan lunas masuk "Menunggu konfirmasi" dan admin harus klik Terima.
  autoAccept: envBoolean("AUTO_ACCEPT_ORDERS", true),
  // MDR QRIS ditanggung pemilik, hanya dicatat di laporan laba. Default kriteria merchant UMI (ketentuan BI):
  // transaksi <= freeMax tidak dikenai MDR, di atasnya dikenai rate.
  qrisMdr: {
    rate: envNumber("QRIS_MDR_RATE", 0.003),
    freeMax: envNumber("QRIS_MDR_FREE_MAX", 100000),
  },
};

// MDR (Rp, dibulatkan ke atas) yang dipotong dari satu transaksi QRIS sebesar `amount`.
const qrisMdrAmount = (amount: number): number => (amount <= orderConfig.qrisMdr.freeMax ? 0 : Math.ceil(amount * orderConfig.qrisMdr.rate));

const biteshipConfig = {
  baseUrl: env("BITESHIP_BASE_URL", "https://api.biteship.com"),
  apiKey: env("BITESHIP_API_KEY"),
  // Header statis yang dikirim Biteship di setiap webhook (diatur di dashboard Biteship), dibandingkan dengan nilai ini.
  webhookSecret: env("BITESHIP_WEBHOOK_SECRET"),
  // Development: cek ongkir memakai respons palsu (bentuk sama dengan API) selama saldo Biteship belum diisi. Ditolak di production.
  mockRates: envBoolean("BITESHIP_MOCK_RATES", false),
};

export { orderConfig, qrisMdrAmount, biteshipConfig };
