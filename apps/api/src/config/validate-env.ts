import { validateEnv } from "@config/env.config";

/**
 * Import modul ini PALING AWAL di entrypoint (setelah ./paths), sebelum modul lain membaca config atau membuat
 * provider (mailer, payment gateway). Konfigurasi salah -> proses berhenti dengan daftar masalahnya.
 * Ditulis langsung ke stderr karena logger belum tentu siap pada titik ini.
 */
try {
  validateEnv();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
