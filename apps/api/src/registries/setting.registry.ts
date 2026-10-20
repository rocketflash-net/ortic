import { z } from "zod";

/**
 * Pengaturan toko yang diubah Owner di dashboard (tabel `settings`, satu baris per key, nilai JSON).
 * Menambah pengaturan: daftarkan di sini (default + validasi), lalu baca dengan SettingRepository.
 */
const money = () => z.number().int().min(0).max(1000000000);

const SETTING_DEFINITIONS = {
  // Harga jual = harga dasar x (1 + markup), dibulatkan ke atas ke kelipatan price_rounding.
  markup_percent: { default: 5, schema: z.number().min(0).max(1000) },
  price_rounding: { default: 500, schema: z.number().int().min(1).max(100000) },
  // Biaya layanan per paket (menutup langganan & panggilan API Biteship).
  service_fee: { default: 1000, schema: money() },
  // Berat kemasan yang ditambahkan ke berat produk saat cek ongkir.
  packaging_weight_gram: { default: 100, schema: z.number().int().min(0).max(20000) },
  // Asuransi wajib bila nilai barang mencapai angka ini (Rp).
  insurance_required_above: { default: 1000000, schema: money() },
  // Peringatan saldo Biteship di bawah nilai ini (Rp).
  biteship_low_balance: { default: 500000, schema: money() },
  // Kontak toko (footer, halaman bantuan & kebijakan, email ke pembeli).
  store_name: { default: "Ortic Indonesia", schema: z.string().trim().min(1).max(100) },
  store_whatsapp: {
    default: "",
    schema: z
      .string()
      .trim()
      .regex(/^(\+?\d{8,15})?$/, "must be 8-15 digits"),
  },
  store_email: { default: "", schema: z.union([z.literal(""), z.email().max(191)]) },
  store_instagram: { default: "ortic_id", schema: z.string().trim().max(60) },
  store_address: { default: "", schema: z.string().trim().max(500) },
  // Email yang menerima notifikasi pesanan baru. Kosong = semua Owner.
  order_notification_emails: { default: [] as string[], schema: z.array(z.email().max(191)).max(10) },
} as const;

type SettingKeyType = keyof typeof SETTING_DEFINITIONS;

type SettingValuesType = { -readonly [K in SettingKeyType]: z.infer<(typeof SETTING_DEFINITIONS)[K]["schema"]> };

const SETTING_KEYS = Object.keys(SETTING_DEFINITIONS) as SettingKeyType[];

// Key yang boleh dibaca toko tanpa login.
const PUBLIC_SETTING_KEYS = [
  "store_name",
  "store_whatsapp",
  "store_email",
  "store_instagram",
  "store_address",
  "service_fee",
  "insurance_required_above",
] as const satisfies readonly SettingKeyType[];

const updateSettingsSchema = z
  .object(
    Object.fromEntries(SETTING_KEYS.map((key) => [key, SETTING_DEFINITIONS[key].schema.optional()])) as {
      [K in SettingKeyType]: z.ZodOptional<(typeof SETTING_DEFINITIONS)[K]["schema"]>;
    }
  )
  .refine((input) => Object.values(input).some((value) => value !== undefined), "Provide at least one setting to update");

type UpdateSettingsInputType = Partial<SettingValuesType>;

const settingDefaults = (): SettingValuesType =>
  Object.fromEntries(SETTING_KEYS.map((key) => [key, SETTING_DEFINITIONS[key].default])) as unknown as SettingValuesType;

export {
  SETTING_DEFINITIONS,
  SETTING_KEYS,
  PUBLIC_SETTING_KEYS,
  updateSettingsSchema,
  settingDefaults,
  type SettingKeyType,
  type SettingValuesType,
  type UpdateSettingsInputType,
};
