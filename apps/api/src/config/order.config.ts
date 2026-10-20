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
  // Header statis yang dikirim Biteship di setiap webhook (dashboard Biteship > Webhook > "Signature Key" & "Signature Secret").
  // Kosong = webhook ditolak (kecuali panggilan cek instalasi tanpa event).
  webhookHeader: env("BITESHIP_WEBHOOK_HEADER", "x-ortic-webhook-secret").toLowerCase(),
  webhookSecret: env("BITESHIP_WEBHOOK_SECRET"),
  // Development: cek ongkir memakai respons palsu (bentuk sama dengan API) selama saldo Biteship belum diisi. Ditolak di production.
  mockRates: envBoolean("BITESHIP_MOCK_RATES", false),
  // Development: booking order (POST /v1/orders) memakai resi palsu, dan status pengiriman bisa disimulasikan dari
  // dashboard. Default mengikuti BITESHIP_MOCK_RATES. Ditolak di production.
  mockOrders: envBoolean("BITESHIP_MOCK_ORDERS", envBoolean("BITESHIP_MOCK_RATES", false)),
  // Rekonsiliasi status pengiriman ke Biteship (cadangan bila webhook tidak sampai). Default 2 jam.
  trackingIntervalMs: envNumber("BITESHIP_TRACKING_INTERVAL_MS", 2 * 60 * 60 * 1000),
  // Cache hasil cek ongkir (rute + berat + kurir sama) supaya tidak membayar panggilan Rates berulang. Default 24 jam.
  ratesCacheTtlMs: envNumber("BITESHIP_RATES_CACHE_TTL_MS", 24 * 60 * 60 * 1000),
};

export { orderConfig, qrisMdrAmount, biteshipConfig };
