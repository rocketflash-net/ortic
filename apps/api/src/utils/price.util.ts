// Harga jual = harga dasar x (1 + markup%), dibulatkan ke atas ke kelipatan `rounding` (default Rp500).
// Contoh: 23.000 x 1,05 = 24.150 -> 24.500.
const sellingPrice = (basePrice: number, markupPercent: number, rounding: number): number => {
  // Dihitung dalam sen supaya 1,05 x 20.000 tidak menjadi 21.000,000000004 lalu naik ke kelipatan berikutnya.
  const raw = Math.round(basePrice * (100 + markupPercent)) / 100;
  const step = rounding > 0 ? rounding : 1;
  return Math.ceil(raw / step) * step;
};

// Markup yang berlaku: varian -> produk -> global.
const effectiveMarkup = (variantMarkup: number | null | undefined, productMarkup: number | null | undefined, globalMarkup: number): number =>
  variantMarkup ?? productMarkup ?? globalMarkup;

export { sellingPrice, effectiveMarkup };
