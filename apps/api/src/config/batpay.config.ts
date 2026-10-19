import { createPrivateKey, createPublicKey } from "crypto";
import fs from "fs";
import { env, envNumber } from "@config/env.config";
import { normalizePem } from "@utils/pem.util";

/**
 * BatPay Open API (SNAP) — https://developer.batbiz.id
 * Kredensial didapat saat onboarding merchant di BatPay; public key kita di-upload ke BatPay,
 * dan BatPay memberi public key-nya untuk memverifikasi callback.
 */
const batpayConfig = {
  // Sandbox: https://sb-openapi.batbiz.id
  baseUrl: env("BATPAY_BASE_URL", "https://sb-openapi.batbiz.id"),
  // X-CLIENT-KEY (client id dari BatPay). BatPay juga mengirim nilai ini saat meminta access token callback.
  clientKey: env("BATPAY_CLIENT_KEY"),
  // X-PARTNER-ID.
  partnerId: env("BATPAY_PARTNER_ID"),
  // Secret untuk signature HMAC-SHA512 (request transaksi & verifikasi notifikasi).
  secretKey: env("BATPAY_SECRET_KEY"),
  // Merchant id (MID) penerima pembayaran QRIS.
  merchantId: env("BATPAY_MERCHANT_ID"),
  // Header CHANNEL-ID (maks 5 karakter).
  channelId: env("BATPAY_CHANNEL_ID", "95221"),
  // Secret untuk menandatangani access token yang kita berikan ke BatPay saat callback.
  callbackTokenSecret: env("BATPAY_CALLBACK_TOKEN_SECRET"),
  callbackTokenTtlSeconds: envNumber("BATPAY_CALLBACK_TOKEN_TTL_SECONDS", 900),
  // Toleransi selisih jam X-TIMESTAMP callback (anti-replay).
  maxTimestampSkewSeconds: envNumber("BATPAY_MAX_TIMESTAMP_SKEW_SECONDS", 300),
  timeoutMs: envNumber("BATPAY_TIMEOUT_MS", 15000),
};

// Key PEM bisa diisi langsung (boleh satu baris dengan "\n") atau lewat path file. Dibaca saat dipakai saja,
// supaya aplikasi tetap bisa jalan dengan provider lain tanpa key BatPay.
const loadPem = (valueKey: string, pathKey: string): string => {
  const path = env(pathKey);
  const raw = path ? fs.readFileSync(path, "utf8") : env(valueKey);
  if (!raw) throw new Error(`${valueKey} or ${pathKey} must be set to use BatPay`);
  return normalizePem(raw);
};

// Private key RSA kita (PKCS#8) untuk meminta access token B2B ke BatPay.
const batpayPrivateKey = (): string => loadPem("BATPAY_PRIVATE_KEY", "BATPAY_PRIVATE_KEY_PATH");

// Public key BatPay untuk memverifikasi permintaan access token dari callback BatPay.
const batpayPublicKey = (): string => loadPem("BATPAY_PUBLIC_KEY", "BATPAY_PUBLIC_KEY_PATH");

const MIN_CALLBACK_SECRET_LENGTH = 32;

/**
 * Dipanggil saat BatPay dipilih sebagai provider aktif: gagal saat startup dengan pesan jelas,
 * bukan saat user menekan "Publish".
 */
const assertBatpayConfigured = (): void => {
  const required = {
    BATPAY_BASE_URL: batpayConfig.baseUrl,
    BATPAY_CLIENT_KEY: batpayConfig.clientKey,
    BATPAY_PARTNER_ID: batpayConfig.partnerId,
    BATPAY_SECRET_KEY: batpayConfig.secretKey,
    BATPAY_MERCHANT_ID: batpayConfig.merchantId,
  };
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) throw new Error(`BatPay is not configured, missing: ${missing.join(", ")}`);

  if (batpayConfig.callbackTokenSecret.length < MIN_CALLBACK_SECRET_LENGTH) {
    throw new Error(`BATPAY_CALLBACK_TOKEN_SECRET must be at least ${MIN_CALLBACK_SECRET_LENGTH} characters`);
  }

  // Pastikan kedua key bisa dibaca & di-parse sebagai key RSA.
  createPrivateKey(batpayPrivateKey());
  createPublicKey(batpayPublicKey());
};

export { batpayConfig, batpayPrivateKey, batpayPublicKey, assertBatpayConfigured };
