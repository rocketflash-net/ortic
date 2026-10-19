import { logger } from "@config/logger.config";
import MailerInterface from "@interfaces/mailer.interface";
import { MailMessageType } from "@@types/mail.type";

// Provider email untuk development (tidak aktif di production): isi email ditulis ke log, termasuk kode OTP.
export default class LogMailer implements MailerInterface {
  async send(message: MailMessageType): Promise<void> {
    logger.info({ to: message.to, subject: message.subject }, `[mail] ${message.text}`);
  }
}
