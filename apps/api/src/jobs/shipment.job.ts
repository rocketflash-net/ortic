import { envNumber } from "@config/env.config";
import { logger } from "@config/logger.config";
import ShipmentService from "@services/shipment.service";

const shipmentService = new ShipmentService();

// Seberapa sering job berjalan. Tiap pesanan tetap hanya dicek ulang ke Biteship sekali per BITESHIP_TRACKING_INTERVAL_MS.
const SHIPMENT_JOB_INTERVAL_MS = envNumber("SHIPMENT_JOB_INTERVAL_MS", 5 * 60 * 1000);

/**
 * Job pengiriman:
 * - booking ulang otomatis pesanan Diproses yang booking Biteship-nya gagal (jeda bertambah, maks. 5 percobaan)
 * - rekonsiliasi status pengiriman (cadangan webhook), tiap pesanan paling sering sekali per 2 jam
 */
const runShipmentJob = async (): Promise<void> => {
  const booked = await shipmentService.retryPendingBookings();
  const reconciled = await shipmentService.reconcile();
  if (booked || reconciled) logger.info({ booked, reconciled }, "[shipment-job] done");
};

// Mengembalikan fungsi untuk menghentikan job (dipakai saat graceful shutdown).
const startShipmentJob = (): (() => void) => {
  let running = false;
  const run = () => {
    if (running) return;
    running = true;
    runShipmentJob()
      .catch((error) => logger.error({ err: error }, "[shipment-job] failed"))
      .finally(() => {
        running = false;
      });
  };
  const timer = setInterval(run, SHIPMENT_JOB_INTERVAL_MS);
  // Jalan pertama sedikit setelah start supaya tidak berebut dengan migrasi/boot.
  const first = setTimeout(run, 10_000);
  return () => {
    clearInterval(timer);
    clearTimeout(first);
  };
};

export { startShipmentJob };
