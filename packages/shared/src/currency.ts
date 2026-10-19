const rupiahFormatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

// 250000 -> "Rp 250.000"
export const formatRupiah = (amount: number): string => rupiahFormatter.format(amount);
