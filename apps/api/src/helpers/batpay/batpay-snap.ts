import { createHash, createHmac, createSign, createVerify, randomInt, timingSafeEqual } from "crypto";

/**
 * Aturan SNAP (standar Open API Bank Indonesia) yang dipakai BatPay.
 * Lihat "SNAP & Non SNAP - Signature" di https://developer.batbiz.id
 */

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

// Format waktu SNAP: YYYY-MM-DDTHH:mm:ss+07:00 (WIB).
const toSnapTimestamp = (date: Date = new Date()): string => `${new Date(date.getTime() + JAKARTA_OFFSET_MS).toISOString().slice(0, 19)}+07:00`;

// Nominal SNAP: string dengan 2 desimal, mis. 99000 -> "99000.00".
const toSnapAmount = (rupiah: number): string => rupiah.toFixed(2);

const parseSnapAmount = (value: string | number): number => Math.round(Number(value) * 100) / 100;

// X-EXTERNAL-ID: string angka, unik dalam satu hari.
const snapExternalId = (): string => `${Date.now()}${String(randomInt(1_000_000)).padStart(6, "0")}`;

// Response code SNAP: HTTP status (3) + service code (2) + case code (2), mis. 2005200.
const snapResponseCode = (httpStatus: number, serviceCode: string, caseCode = "00"): string => `${httpStatus}${serviceCode}${caseCode}`;

// --- Signature ---------------------------------------------------------------------------

// String-to-sign permintaan access token B2B: clientKey|timestamp (ditandatangani RSA).
const accessTokenStringToSign = (clientKey: string, timestamp: string): string => `${clientKey}|${timestamp}`;

// String-to-sign transaksi: METHOD:path:accessToken:lowercase(hex(sha256(body))):timestamp (ditandatangani HMAC).
const transactionStringToSign = (input: { method: string; path: string; accessToken: string; rawBody: string; timestamp: string }): string => {
  const bodyHash = createHash("sha256").update(input.rawBody).digest("hex").toLowerCase();
  return `${input.method.toUpperCase()}:${input.path}:${input.accessToken}:${bodyHash}:${input.timestamp}`;
};

const signRsaSha256 = (data: string, privateKey: string): string => createSign("SHA256").update(data).sign(privateKey, "base64");

const verifyRsaSha256 = (data: string, signature: string, publicKey: string): boolean => {
  try {
    return createVerify("SHA256").update(data).verify(publicKey, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
};

const signHmacSha512 = (data: string, secret: string): string => createHmac("sha512", secret).update(data).digest("base64");

const verifyHmacSha512 = (data: string, signature: string, secret: string): boolean => {
  const expected = createHmac("sha512", secret).update(data).digest();
  const actual = Buffer.from(signature, "base64");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

// Tolak timestamp yang terlalu jauh dari jam server (anti-replay).
const isFreshTimestamp = (timestamp: string, maxSkewSeconds: number, now: Date = new Date()): boolean => {
  const time = Date.parse(timestamp);
  return Number.isFinite(time) && Math.abs(now.getTime() - time) <= maxSkewSeconds * 1000;
};

export {
  toSnapTimestamp,
  toSnapAmount,
  parseSnapAmount,
  snapExternalId,
  snapResponseCode,
  accessTokenStringToSign,
  transactionStringToSign,
  signRsaSha256,
  verifyRsaSha256,
  signHmacSha512,
  verifyHmacSha512,
  isFreshTimestamp,
};
