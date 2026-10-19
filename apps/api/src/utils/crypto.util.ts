import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Token acak aman untuk cookie session, OAuth state, dan PKCE verifier.
const randomToken = (bytes = 32): string => randomBytes(bytes).toString("base64url");

// Kode pendek acak (huruf + angka) untuk link tamu, id block, dll.
const randomCode = (length: number, alphabet = BASE62): string => Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");

const sha256Hex = (value: string): string => createHash("sha256").update(value).digest("hex");

const sha256Base64Url = (value: string): string => createHash("sha256").update(value).digest("base64url");

// Bandingkan secret tanpa membocorkan informasi lewat waktu eksekusi.
const safeEqual = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
};

export { randomToken, randomCode, sha256Hex, sha256Base64Url, safeEqual };
