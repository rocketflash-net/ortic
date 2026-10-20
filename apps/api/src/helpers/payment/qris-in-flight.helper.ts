/**
 * Id order yang QRIS-nya sedang dibuat oleh proses ini (checkout atau pemulihan). Hanya di memori: setelah API restart
 * set ini kosong, jadi order yang tertinggal tanpa QRIS langsung bisa dipulihkan. Aman karena API berjalan satu
 * instance (deploy/ecosystem.config.cjs); penyimpanan QRIS tetap dijaga compare-and-set di OrderRepository.attachQris.
 */
export const qrisInFlight = new Set<number>();
