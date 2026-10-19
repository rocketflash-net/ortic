import { env, envBoolean, envNumber } from "@config/env.config";

const mailConfig = {
  // Provider email aktif. Lihat helpers/mail/mailer.factory.ts untuk daftar provider.
  provider: env("MAIL_PROVIDER", "log"),
  // Alamat pengirim untuk SMTP, mis. "Invitation App <no-reply@domain.com>".
  // OneSignal memakai Sender Name/Email di Email Settings dashboard OneSignal.
  from: env("MAIL_FROM", "Invitation App <no-reply@localhost>"),
  smtp: {
    host: env("SMTP_HOST"),
    port: envNumber("SMTP_PORT", 587),
    // true untuk port 465 (TLS langsung); false untuk 587 (STARTTLS).
    secure: envBoolean("SMTP_SECURE", false),
    user: env("SMTP_USER"),
    password: env("SMTP_PASSWORD"),
  },
  // OneSignal Email (REST API). Dashboard OneSignal > Settings > Keys & IDs.
  oneSignal: {
    appId: env("ONESIGNAL_APP_ID"),
    apiKey: env("ONESIGNAL_API_KEY"),
  },
};

type OneSignalConfigType = typeof mailConfig.oneSignal;

export { mailConfig, type OneSignalConfigType };
