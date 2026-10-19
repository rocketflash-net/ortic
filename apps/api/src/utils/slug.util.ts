// Slug: huruf kecil, angka, dan strip (US-11).
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 100;

// Path yang dipakai route apps/invitation, jadi tidak boleh menjadi slug undangan.
const RESERVED_SLUGS = ["preview", "api", "admin", "public", "assets", "login", "expired", "not-found"];

const slugify = (value: string): string =>
  value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH - 10)
    .replace(/-+$/g, "");

const isReservedSlug = (slug: string): boolean => RESERVED_SLUGS.includes(slug);

export { slugify, isReservedSlug, SLUG_PATTERN, SLUG_MIN_LENGTH, SLUG_MAX_LENGTH };
