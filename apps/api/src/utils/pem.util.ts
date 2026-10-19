/**
 * Rapikan key PEM dari env: mendukung "\n" literal dan key yang ditempel satu baris (newline jadi spasi),
 * lalu susun ulang menjadi PEM standar (isi base64 per 64 karakter).
 */
const normalizePem = (raw: string): string => {
  const text = raw.replace(/\\n/g, "\n").trim();
  const match = text.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  if (!match) return text;

  const [, label, body] = match;
  const lines = body.replace(/\s+/g, "").match(/.{1,64}/g) ?? [];
  return [`-----BEGIN ${label}-----`, ...lines, `-----END ${label}-----`].join("\n");
};

export { normalizePem };
