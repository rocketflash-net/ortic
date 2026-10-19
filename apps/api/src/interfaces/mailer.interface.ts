import { MailMessageType } from "@@types/mail.type";

/**
 * Kontrak pengirim email. Provider baru cukup mengimplementasikan interface ini lalu didaftarkan di
 * helpers/mail/mailer.factory.ts.
 */
export default interface MailerInterface {
  send(message: MailMessageType): Promise<void>;
}
