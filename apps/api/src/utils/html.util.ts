import sanitizeHtml from "sanitize-html";

const HTML_ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// Untuk teks dari user (nama, alamat) yang disisipkan ke HTML email.
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);

// Tag yang dihasilkan editor deskripsi produk di dashboard. Selain ini (script, style, iframe, atribut on*) dibuang.
const DESCRIPTION_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "hr", "a", "code"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }) },
};

const looksLikeHtml = (value: string): boolean => /<\/?[a-z][\s\S]*>/i.test(value);

// Deskripsi produk disimpan sebagai HTML yang sudah dibersihkan; teks biasa (input lama) disimpan apa adanya.
const sanitizeDescription = (value: string | null): string | null => {
  if (value === null) return null;
  if (!looksLikeHtml(value)) return value;
  const clean = sanitizeHtml(value, DESCRIPTION_OPTIONS).trim();
  return clean.replace(/<p>\s*<\/p>/g, "") === "" ? null : clean;
};

// Deskripsi untuk ditampilkan di toko: HTML aman. Teks biasa diubah menjadi paragraf (baris kosong) dan <br>.
const descriptionToHtml = (value: string | null): string | null => {
  if (!value) return null;
  if (looksLikeHtml(value)) return sanitizeHtml(value, DESCRIPTION_OPTIONS);
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
};

export { escapeHtml, sanitizeDescription, descriptionToHtml };
