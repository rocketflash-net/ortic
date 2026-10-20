import { formatRupiah } from "@utils/currency.util";
import { appConfig } from "@config/app.config";
import { logger } from "@config/logger.config";
import UserRoleEnum from "@enums/user-role.enum";
import { createMailer } from "@helpers/mail/mailer.factory";
import MailerInterface from "@interfaces/mailer.interface";
import SettingRepository from "@repositories/setting.repository";
import UserRepository from "@repositories/user.repository";
import { OrderType } from "@@types/entity.type";
import { MailMessageType } from "@@types/mail.type";
import { escapeHtml } from "@utils/html.util";

type BuyerMailKindType = "paid" | "shipped" | "completed" | "rejected" | "refunded";

/**
 * Email pesanan. Gagal kirim hanya dicatat di log: email tidak boleh menggagalkan pembayaran atau pengiriman.
 * Pembeli: pembayaran diterima, paket dikirim (resi), pesanan selesai, pesanan ditolak, refund selesai.
 * Admin: pesanan baru lunas (ke order_notification_emails, atau semua Owner bila kosong).
 */
export default class OrderMailService {
  private mailer: MailerInterface | null = null;

  constructor(
    private readonly userRepository: UserRepository = new UserRepository(),
    private readonly settingRepository: SettingRepository = new SettingRepository()
  ) {}

  async toBuyer(kind: BuyerMailKindType, order: OrderType): Promise<void> {
    try {
      const [user, settings] = await Promise.all([this.userRepository.findById(order.userId), this.settingRepository.getAll()]);
      if (!user) return;
      const link = `${appConfig.webUrl}/pesanan/${order.code}`;
      const content = this.buyerContent(kind, order);
      await this.send({
        to: user.email,
        subject: `${content.subject} · ${order.code}`,
        text: `Halo ${user.name},\n\n${content.text}\n\nLihat pesanan: ${link}\n\n${settings.store_name}`,
        html: this.layout(
          settings.store_name,
          `<p>Halo ${escapeHtml(user.name)},</p>${content.html}<p><a href="${link}">Lihat pesanan ${escapeHtml(order.code)}</a></p>`
        ),
      });
    } catch (error) {
      logger.error({ err: error, orderId: order.id, kind }, "[order-mail] failed to send buyer email");
    }
  }

  async newOrderToAdmins(order: OrderType, needsAction: boolean): Promise<void> {
    try {
      const settings = await this.settingRepository.getAll();
      const recipients = settings.order_notification_emails.length
        ? settings.order_notification_emails
        : (await this.userRepository.findAdmins()).filter((user) => user.role === UserRoleEnum.superadmin).map((user) => user.email);
      const link = `${appConfig.adminUrl}/orders/${order.code}`;
      const subject = needsAction ? `Pesanan perlu dicek: ${order.code}` : `Pesanan baru lunas: ${order.code}`;
      const summary = `${order.recipientName} (${order.city}) · ${formatRupiah(order.total)} · ${order.courierName} ${order.courierServiceName}`;
      for (const to of recipients) {
        await this.send({
          to,
          subject,
          text: `${subject}\n${summary}\n\nBuka dashboard: ${link}`,
          html: this.layout(
            settings.store_name,
            `<p><strong>${escapeHtml(subject)}</strong></p><p>${escapeHtml(summary)}</p><p><a href="${link}">Buka di dashboard</a></p>`
          ),
        });
      }
    } catch (error) {
      logger.error({ err: error, orderId: order.id }, "[order-mail] failed to send admin email");
    }
  }

  private buyerContent(kind: BuyerMailKindType, order: OrderType): { subject: string; text: string; html: string } {
    const total = formatRupiah(order.total);
    switch (kind) {
      case "paid": {
        const text = `Pembayaran ${total} untuk pesanan ${order.code} sudah kami terima. Pesanan sedang disiapkan dan akan dijemput kurir ${order.courierName}.`;
        return { subject: "Pembayaran diterima", text, html: `<p>${escapeHtml(text)}</p>` };
      }
      case "shipped": {
        const text = `Pesanan ${order.code} sudah dijemput kurir ${order.courierName} ${order.courierServiceName}. Nomor resi: ${order.waybillId ?? "-"}.`;
        return { subject: "Pesanan dikirim", text, html: `<p>${escapeHtml(text)}</p>` };
      }
      case "completed": {
        const text = `Paket pesanan ${order.code} sudah diterima. Terima kasih sudah berbelanja di Ortic!`;
        return { subject: "Pesanan selesai", text, html: `<p>${escapeHtml(text)}</p>` };
      }
      case "rejected": {
        const reason = order.rejectReason ? ` Alasan: ${order.rejectReason}.` : "";
        const refund = order.paidAt
          ? ` Dana ${formatRupiah(order.refundAmount ?? order.total)} akan kami kembalikan; tim kami akan menghubungi Anda untuk data rekening.`
          : "";
        const text = `Mohon maaf, pesanan ${order.code} tidak dapat kami proses.${reason}${refund}`;
        return { subject: "Pesanan dibatalkan toko", text, html: `<p>${escapeHtml(text)}</p>` };
      }
      case "refunded": {
        const text = `Refund ${formatRupiah(order.refundAmount ?? order.total)} untuk pesanan ${order.code} sudah kami transfer.${order.refundNote ? ` Catatan: ${order.refundNote}.` : ""}`;
        return { subject: "Refund selesai", text, html: `<p>${escapeHtml(text)}</p>` };
      }
    }
  }

  private layout(storeName: string, body: string): string {
    return `<div style="font-family:Poppins,Arial,sans-serif;font-size:14px;color:#1f2937;max-width:560px">${body}<p style="color:#6b7280;font-size:12px">${escapeHtml(storeName)} · ortic.id</p></div>`;
  }

  private async send(message: MailMessageType): Promise<void> {
    this.mailer ??= createMailer();
    await this.mailer.send(message);
  }
}
