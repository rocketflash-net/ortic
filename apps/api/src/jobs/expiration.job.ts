import { appConfig } from "@config/app.config";
import { authConfig } from "@config/auth.config";
import { logger } from "@config/logger.config";
import AuthExchangeCodeRepository from "@repositories/auth-exchange-code.repository";
import EmailLoginCodeRepository from "@repositories/email-login-code.repository";
import SessionRepository from "@repositories/session.repository";
import OrderService from "@services/order.service";
import { addDays } from "@utils/date.util";

const sessionRepository = new SessionRepository();
const emailLoginCodeRepository = new EmailLoginCodeRepository();
const authExchangeCodeRepository = new AuthExchangeCodeRepository();
const orderService = new OrderService();

// Kode OTP yang sudah tidak berlaku disimpan sebentar (untuk hitungan batas per jam), lalu dihapus.
const LOGIN_CODE_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * Job berkala yang menjalankan pembersihan berbasis waktu:
 * - hapus session yang sudah kedaluwarsa atau menganggur melewati idle timeout
 * - hapus kode OTP login & kode tukar login Google yang sudah tidak berlaku lebih dari 24 jam
 * - pesanan yang QRIS-nya kedaluwarsa: dicek sekali lagi ke provider, lalu dibatalkan bila memang belum dibayar
 *   (fitur stok nanti juga melepas reservasi stoknya di sini)
 */
const runExpiration = async (): Promise<void> => {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - LOGIN_CODE_RETENTION_MS);
  const [deletedSessions, deletedLoginCodes, deletedExchangeCodes, cancelledOrders] = await Promise.all([
    sessionRepository.destroyExpired(now, addDays(now, -authConfig.refreshToken.idleDays)),
    emailLoginCodeRepository.destroyStale(staleBefore),
    authExchangeCodeRepository.destroyStale(staleBefore),
    orderService.expireUnpaid(now),
  ]);

  const counts = { deletedSessions, deletedLoginCodes, deletedExchangeCodes, cancelledOrders };
  if (Object.values(counts).some(Boolean)) logger.info(counts, "[expiration-job] done");
};

// Mengembalikan fungsi untuk menghentikan job (dipakai saat graceful shutdown).
const startExpirationJob = (): (() => void) => {
  const run = () => runExpiration().catch((error) => logger.error({ err: error }, "[expiration-job] failed"));
  run();

  const timer = setInterval(run, appConfig.expirationJobIntervalMs);
  return () => clearInterval(timer);
};

export { startExpirationJob };
