import Helper from "@base/helper.base";
import { logger } from "@config/logger.config";
import { mailConfig, OneSignalConfigType } from "@config/mail.config";
import MailerInterface from "@interfaces/mailer.interface";
import { MailMessageType } from "@@types/mail.type";

const API_URL = "https://api.onesignal.com";
const SEND_PATH = "/notifications?c=email";
const TIMEOUT_MS = 10_000;

// `id` kosong berarti tidak ada email yang dikirim; alasannya ada di `errors`.
type OneSignalResponseType = {
  id?: string;
  errors?: unknown;
};

/**
 * Kirim email lewat OneSignal Email REST API (https://documentation.onesignal.com/reference/email).
 * - Penerima lewat `email_to`; OneSignal otomatis mendaftarkan alamat itu sebagai subscription email di app.
 * - `include_unsubscribed`: email akun (kode login) tetap terkirim walau alamatnya pernah unsubscribe dari email marketing.
 * - Pengirim (nama/alamat/domain) memakai Email Settings di dashboard OneSignal.
 * Detail error OneSignal hanya ditulis ke log; client menerima error umum.
 */
export default class OneSignalMailer extends Helper implements MailerInterface {
  constructor(private readonly config: OneSignalConfigType = mailConfig.oneSignal) {
    super(API_URL);
  }

  async send(message: MailMessageType): Promise<void> {
    let response: OneSignalResponseType;
    try {
      ({ data: response } = await this.request<OneSignalResponseType>(SEND_PATH, {
        method: "POST",
        headers: { authorization: `Key ${this.config.apiKey}` },
        body: {
          app_id: this.config.appId,
          target_channel: "email",
          email_to: [message.to],
          email_subject: message.subject,
          email_body: message.html,
          include_unsubscribed: true,
          disable_email_click_tracking: true,
        },
        timeoutMs: TIMEOUT_MS,
      }));
    } catch (error) {
      logger.error({ err: error, detail: (error as { additionalInfo?: unknown }).additionalInfo }, "[mail] OneSignal request failed");
      throw new Error("Email delivery failed");
    }

    if (!response?.id) {
      logger.error({ errors: response?.errors }, "[mail] OneSignal did not send the email");
      throw new Error("Email delivery failed");
    }
  }
}
