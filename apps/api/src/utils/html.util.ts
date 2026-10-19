const HTML_ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// Untuk teks dari user (judul undangan, nama) yang disisipkan ke HTML email.
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);

export { escapeHtml };
