import { isProduction } from "@config/app.config";
import { mailConfig } from "@config/mail.config";
import LogMailer from "@helpers/mail/log.mailer";
import OneSignalMailer from "@helpers/mail/onesignal.mailer";
import SmtpMailer from "@helpers/mail/smtp.mailer";
import MailerInterface from "@interfaces/mailer.interface";

// Daftar provider email. Menambah provider: buat class yang implements MailerInterface di folder ini,
// daftarkan di sini, lalu set MAIL_PROVIDER di .env.
const PROVIDERS: Record<string, () => MailerInterface> = {
  log: () => new LogMailer(),
  smtp: () => {
    if (!mailConfig.smtp.host) throw new Error("SMTP_HOST is required when MAIL_PROVIDER=smtp");
    return new SmtpMailer();
  },
  onesignal: () => {
    const { appId, apiKey } = mailConfig.oneSignal;
    const missing = [!appId && "ONESIGNAL_APP_ID", !apiKey && "ONESIGNAL_API_KEY"].filter(Boolean);
    if (missing.length > 0) throw new Error(`MAIL_PROVIDER=onesignal is not configured, missing: ${missing.join(", ")}`);
    return new OneSignalMailer();
  },
};

const createMailer = (provider: string = mailConfig.provider): MailerInterface => {
  if (provider === "log" && isProduction()) {
    throw new Error("MAIL_PROVIDER=log is not allowed in production");
  }

  const factory = PROVIDERS[provider];
  if (!factory) throw new Error(`Unknown MAIL_PROVIDER "${provider}"`);
  return factory();
};

export { createMailer };
