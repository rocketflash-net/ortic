// PM2 untuk API Ortic di server production.
//   npm ci && npm run build            (root repo)
//   npm run db:migrate:prod --workspace @ortic/api
//   pm2 start deploy/ecosystem.config.cjs && pm2 save && pm2 startup
//
// Satu instance saja: job berkala (QRIS kedaluwarsa, booking ulang kurir, rekonsiliasi tracking) dan notifikasi SSE
// berjalan di dalam proses API. Menjalankan lebih dari satu instance membuat job berjalan ganda.
module.exports = {
  apps: [
    {
      name: "ortic-api",
      cwd: __dirname + "/../apps/api",
      script: "build/index.js",
      node_args: "--env-file=.env",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      // Beri waktu graceful shutdown (API menunggu request berjalan selesai, maks. 10 detik).
      kill_timeout: 12000,
      env: { NODE_ENV: "production" },
      out_file: "/var/log/ortic/api.out.log",
      error_file: "/var/log/ortic/api.err.log",
      time: true,
    },
  ],
};
