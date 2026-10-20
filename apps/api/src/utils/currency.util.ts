const rupiahFormatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

// 250000 -> "Rp 250.000" (sama dengan formatRupiah di packages/shared, dipakai untuk email & CSV).
const formatRupiah = (amount: number): string => rupiahFormatter.format(amount);

export { formatRupiah };
