const MASK = "XXXXX";

// Field sensitif yang akan di-mask saat logging request / response.
const hiddenParameters = (): string[] => [
  "password",
  "confirm_password",
  "old_password",
  "new_password",
  "pin",
  "otp",
  "secret",
  "secret_key",
  "api_key",
  "private_key",
  "access_token",
  "refresh_token",
  "id_token",
  "accessToken",
  "authorization",
  // Parameter callback OAuth Google.
  "code",
  "state",
  "code_verifier",
  "card_number",
  "cvv",
  "nik",
  "npwp",
];

const maskSensitiveFields = (value: unknown, fields: string[] = hiddenParameters()): unknown => {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => maskSensitiveFields(item, fields));

  const lowerFields = fields.map((field) => field.toLowerCase());
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      lowerFields.includes(key.toLowerCase()) ? MASK : maskSensitiveFields(item, fields),
    ])
  );
};

const maskSensitiveQueryParams = (url: string, fields: string[] = hiddenParameters()): string => {
  const queryIndex = url.indexOf("?");
  if (queryIndex === -1) return url;

  const params = new URLSearchParams(url.slice(queryIndex + 1));
  const lowerFields = fields.map((field) => field.toLowerCase());
  for (const key of params.keys()) {
    if (lowerFields.includes(key.toLowerCase())) params.set(key, MASK);
  }
  return `${url.slice(0, queryIndex)}?${params.toString()}`;
};

const epochTime = (unit: "seconds" | "milliseconds" = "seconds"): number => {
  const now = Date.now();
  return unit === "seconds" ? Math.floor(now / 1000) : now;
};

export { hiddenParameters, maskSensitiveFields, maskSensitiveQueryParams, epochTime };
