import { sql } from "drizzle-orm";
import { settings } from "@models/setting.model";
import { DatabaseExecutorType } from "@@types/database.type";
import { NewSettingType } from "@@types/entity.type";

// Nilai awal pengaturan toko. Diubah Owner di dashboard (Pengaturan Toko).
const data: NewSettingType[] = [
  // Harga jual = harga dasar x (1 + markup), dibulatkan ke atas ke kelipatan price_rounding.
  { key: "markup_percent", value: 5 },
  { key: "price_rounding", value: 500 },
  // Biaya layanan per paket (menutup langganan & panggilan API Biteship).
  { key: "service_fee", value: 1000 },
  // Berat kemasan yang ditambahkan ke berat produk saat cek ongkir.
  { key: "packaging_weight_gram", value: 100 },
  // Asuransi wajib di atas nilai barang ini (Rp).
  { key: "insurance_required_above", value: 1000000 },
  // Peringatan saldo Biteship di bawah nilai ini (Rp).
  { key: "biteship_low_balance", value: 500000 },
];

export default {
  name: "setting.seeder",
  run: async (executor: DatabaseExecutorType): Promise<void> => {
    await executor
      .insert(settings)
      .values(data)
      .onDuplicateKeyUpdate({ set: { key: sql`${settings.key}` } });
  },
};
