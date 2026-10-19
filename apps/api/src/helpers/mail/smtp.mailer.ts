import nodemailer, { Transporter } from "nodemailer";
import { mailConfig } from "@config/mail.config";
import MailerInterface from "@interfaces/mailer.interface";
import { MailMessageType } from "@@types/mail.type";

// Kirim lewat SMTP; bisa dipakai dengan provider apa pun (Gmail Workspace, SES, Resend, Brevo, dll).
export default class SmtpMailer implements MailerInterface {
  private readonly transporter: Transporter;

  constructor() {
    const { host, port, secure, user, password } = mailConfig.smtp;
    this.transporter = nodemailer.createTransport({ host, port, secure, auth: user ? { user, pass: password } : undefined });
  }

  async send(message: MailMessageType): Promise<void> {
    await this.transporter.sendMail({ from: mailConfig.from, ...message });
  }
}
