import {
  BiteshipErrorResponseType,
  BiteshipPricingType,
  BiteshipRateItemType,
  BiteshipRateLocationType,
  BiteshipRatesRequestType,
  BiteshipRatesResponseType,
} from "@@types/biteship.type";

/**
 * Cek ongkir palsu untuk development (BITESHIP_MOCK_RATES=true, tidak boleh di production), dipakai selama
 * saldo Biteship belum diisi. Bentuk request, response, dan error sama persis dengan POST /v1/rates/couriers
 * (https://biteship.com/id/docs/api/rates/retrieve); angkanya perkiraan:
 * - Zona dari 2–3 digit awal kode pos asal & tujuan (sekota, seprovinsi, sepulau, pulau tetangga, jauh, Maluku/Papua).
 * - Berat ditagih per kg: max(berat aktual, volume P×L×T/6000) per item, toleransi 0,3 kg, minimal 1 kg.
 * - Layanan & durasi diambil dari GET /v1/couriers akun Ortic (JNE, J&T, SiCepat).
 * Data wilayah (kota, kecamatan, alamat) di origin/destination tidak diketahui offline, jadi diisi string kosong;
 * koordinat yang tidak dikirim diisi 0 dan location_id dibuat dari kode pos, supaya tipe field tetap sama dengan API.
 */

type MockResultType = { status: number; data: BiteshipRatesResponseType | BiteshipErrorResponseType };

type MockServiceType = {
  courier_name: string;
  courier_code: string;
  courier_service_name: string;
  courier_service_code: string;
  description: string;
  service_type: string;
  shipping_type: string;
  // Pengali tarif REG per kg.
  rateFactor: number;
  // Tambahan hari terhadap durasi REG zona tersebut.
  extraDays: number;
  // Berat minimal (kg) untuk layanan kargo.
  minKg?: number;
  // Layanan "besok sampai" hanya tersedia sampai zona ini.
  maxZone?: number;
  insurance: (value: number) => number;
};

// Daftar layanan dari GET /v1/couriers akun Ortic (2026-10-19).
const SERVICES: MockServiceType[] = [
  {
    courier_name: "JNE",
    courier_code: "jne",
    courier_service_name: "Reguler",
    courier_service_code: "reg",
    description: "Regular service",
    service_type: "standard",
    shipping_type: "parcel",
    rateFactor: 1,
    extraDays: 0,
    insurance: (v) => Math.ceil(v * 0.002) + 5000,
  },
  {
    courier_name: "JNE",
    courier_code: "jne",
    courier_service_name: "YES",
    courier_service_code: "yes",
    description: "Express, next day",
    service_type: "overnight",
    shipping_type: "parcel",
    rateFactor: 1.8,
    extraDays: 0,
    maxZone: 3,
    insurance: (v) => Math.ceil(v * 0.002) + 5000,
  },
  {
    courier_name: "JNE",
    courier_code: "jne",
    courier_service_name: "OKE",
    courier_service_code: "oke",
    description: "Economy servive",
    service_type: "standard",
    shipping_type: "parcel",
    rateFactor: 0.85,
    extraDays: 1,
    insurance: (v) => Math.ceil(v * 0.002) + 5000,
  },
  {
    courier_name: "JNE",
    courier_code: "jne",
    courier_service_name: "JTR",
    courier_service_code: "jtr",
    description: "Trucking with minimum weight of 10 kg",
    service_type: "standard",
    shipping_type: "freight",
    rateFactor: 0.55,
    extraDays: 2,
    minKg: 10,
    insurance: (v) => Math.ceil(v * 0.002) + 5000,
  },
  {
    courier_name: "J&T",
    courier_code: "jnt",
    courier_service_name: "EZ",
    courier_service_code: "ez",
    description: "Layanan reguler",
    service_type: "standard",
    shipping_type: "parcel",
    rateFactor: 0.97,
    extraDays: 0,
    insurance: (v) => Math.max(Math.ceil(v * 0.002), 1000),
  },
  {
    courier_name: "SiCepat",
    courier_code: "sicepat",
    courier_service_name: "Reguler",
    courier_service_code: "reg",
    description: "Layanan reguler",
    service_type: "standard",
    shipping_type: "parcel",
    rateFactor: 0.95,
    extraDays: 0,
    insurance: (v) => Math.max(Math.ceil(v * 0.002), 1000),
  },
  {
    courier_name: "SiCepat",
    courier_code: "sicepat",
    courier_service_name: "Best",
    courier_service_code: "best",
    description: "Besok sampai tujuan",
    service_type: "overnight",
    shipping_type: "parcel",
    rateFactor: 1.6,
    extraDays: 0,
    maxZone: 3,
    insurance: (v) => Math.max(Math.ceil(v * 0.002), 1000),
  },
  {
    courier_name: "SiCepat",
    courier_code: "sicepat",
    courier_service_name: "GOKIL",
    courier_service_code: "gokil",
    description: "Layanan kargo",
    service_type: "standard",
    shipping_type: "freight",
    rateFactor: 0.5,
    extraDays: 2,
    minKg: 10,
    insurance: (v) => Math.max(Math.ceil(v * 0.002), 1000),
  },
];

// Tarif REG per kg dan durasi (hari) per zona: sekota, seprovinsi, sepulau, pulau tetangga, jauh, Maluku/Papua.
const ZONE_RATE_PER_KG = [9000, 12000, 18000, 25000, 38000, 70000];
const ZONE_DAYS: [number, number][] = [
  [1, 2],
  [2, 3],
  [2, 4],
  [3, 5],
  [4, 7],
  [5, 10],
];
// Zona bila asal/tujuan tidak punya kode pos (hanya koordinat / type).
const UNKNOWN_ZONE = 2;

// Dua digit awal kode pos -> [provinsi, pulau].
const POSTAL_PREFIXES: [number, number, string, string][] = [
  [10, 14, "DKI Jakarta", "jawa"],
  [15, 15, "Banten", "jawa"],
  [16, 17, "Jawa Barat", "jawa"],
  [20, 22, "Sumatera Utara", "sumatera"],
  [23, 24, "Aceh", "sumatera"],
  [25, 27, "Sumatera Barat", "sumatera"],
  [28, 28, "Riau", "sumatera"],
  [29, 29, "Kepulauan Riau", "sumatera"],
  [30, 32, "Sumatera Selatan", "sumatera"],
  [33, 33, "Kepulauan Bangka Belitung", "sumatera"],
  [34, 35, "Lampung", "sumatera"],
  [36, 37, "Jambi", "sumatera"],
  [38, 39, "Bengkulu", "sumatera"],
  [40, 41, "Jawa Barat", "jawa"],
  [42, 42, "Banten", "jawa"],
  [43, 46, "Jawa Barat", "jawa"],
  [50, 54, "Jawa Tengah", "jawa"],
  [55, 55, "DI Yogyakarta", "jawa"],
  [56, 59, "Jawa Tengah", "jawa"],
  [60, 69, "Jawa Timur", "jawa"],
  [70, 72, "Kalimantan Selatan", "kalimantan"],
  [73, 74, "Kalimantan Tengah", "kalimantan"],
  [75, 77, "Kalimantan Timur", "kalimantan"],
  [78, 79, "Kalimantan Barat", "kalimantan"],
  [80, 82, "Bali", "nusa"],
  [83, 84, "Nusa Tenggara Barat", "nusa"],
  [85, 87, "Nusa Tenggara Timur", "nusa"],
  [90, 92, "Sulawesi Selatan", "sulawesi"],
  [93, 93, "Sulawesi Tenggara", "sulawesi"],
  [94, 94, "Sulawesi Tengah", "sulawesi"],
  [95, 95, "Sulawesi Utara", "sulawesi"],
  [96, 96, "Gorontalo", "sulawesi"],
  [97, 97, "Maluku", "timur"],
  [98, 99, "Papua", "timur"],
];

const NEIGHBOR_ISLANDS = new Set(["jawa:sumatera", "jawa:nusa", "jawa:kalimantan", "kalimantan:sulawesi", "nusa:sulawesi"]);

const errorResult = (error: string, code: number): MockResultType => ({ status: 400, data: { success: false, error, code } });
const missingParameter = () =>
  errorResult("Get pricing failed caused by missing parameter(s). Please contact support@biteship.com for this problem.", 40001002);
const invalidPostalCode = () =>
  errorResult("Failed due to invalid or not available postal code. Please contact support@biteship.com for this matter.", 40001001);
const noCourier = () =>
  errorResult("No courier available for requested location. Please activate other courier option to receive other pricing rate.", 40001010);

const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

// Kode pos dari area_id Biteship (akhiran "IDZ28261") atau dari field postal_code.
const postalCodeOf = (areaId: string | undefined, postalCode: number | undefined): number | null | "invalid" => {
  if (areaId !== undefined) {
    const match = /IDZ(\d{5})$/.exec(areaId);
    return match ? Number(match[1]) : "invalid";
  }
  if (postalCode !== undefined) return /^\d{5}$/.test(String(postalCode)) ? postalCode : "invalid";
  return null;
};

const regionOf = (postalCode: number | null) => {
  if (postalCode === null) return null;
  const prefix = Math.floor(postalCode / 1000);
  const region = POSTAL_PREFIXES.find(([from, to]) => prefix >= from && prefix <= to);
  return region ? { province: region[2], island: region[3] } : null;
};

const zoneOf = (origin: number | null, destination: number | null): number => {
  const from = regionOf(origin);
  const to = regionOf(destination);
  if (origin === null || destination === null || !from || !to) return UNKNOWN_ZONE;
  if (from.island === "timur" || to.island === "timur") return from.island === to.island && from.province === to.province ? 1 : 5;
  if (Math.floor(origin / 100) === Math.floor(destination / 100)) return 0;
  if (from.province === to.province) return 1;
  if (from.island === to.island) return 2;
  return NEIGHBOR_ISLANDS.has([from.island, to.island].sort().join(":")) ? 3 : 4;
};

const location = (postalCode: number | null, latitude: number | undefined, longitude: number | undefined): BiteshipRateLocationType => ({
  // ObjectId 24 karakter hex seperti milik Biteship.
  location_id: `mock${String(postalCode ?? 0).padStart(20, "0")}`.replace(/[^0-9a-f]/g, "0"),
  latitude: latitude ?? 0,
  longitude: longitude ?? 0,
  postal_code: postalCode ?? 0,
  country_name: "Indonesia",
  country_code: "ID",
  administrative_division_level_1_name: regionOf(postalCode)?.province ?? "",
  administrative_division_level_1_type: "province",
  administrative_division_level_2_name: "",
  administrative_division_level_2_type: "city",
  administrative_division_level_3_name: "",
  administrative_division_level_3_type: "district",
  administrative_division_level_4_name: "",
  administrative_division_level_4_type: "subdistrict",
  address: "",
});

// Berat tagih (kg): per item max(aktual, volume/6000), toleransi 0,3 kg, minimal 1 kg.
const chargeableKg = (items: BiteshipRateItemType[]): number => {
  const kg = items.reduce((sum, item) => {
    const volumeKg = item.length && item.width && item.height ? (item.length * item.width * item.height) / 6000 : 0;
    return sum + Math.max(item.weight / 1000, volumeKg) * item.quantity;
  }, 0);
  return Math.max(1, Math.ceil(kg - 0.3));
};

const roundUp = (amount: number, step: number) => Math.ceil(amount / step) * step;

const isValidItem = (item: Partial<BiteshipRateItemType>) =>
  typeof item?.name === "string" && item.name !== "" && isNumber(item.value) && isNumber(item.quantity) && item.quantity > 0 && isNumber(item.weight);

const hasOrigin = (body: BiteshipRatesRequestType) =>
  body.origin_area_id !== undefined ||
  body.origin_postal_code !== undefined ||
  (isNumber(body.origin_latitude) && isNumber(body.origin_longitude)) ||
  body.type === "origin_suggestion_to_closest_destination";

const hasDestination = (body: BiteshipRatesRequestType) =>
  body.destination_area_id !== undefined ||
  body.destination_postal_code !== undefined ||
  (isNumber(body.destination_latitude) && isNumber(body.destination_longitude));

const mockRates = (body: BiteshipRatesRequestType): MockResultType => {
  if (!body || typeof body.couriers !== "string" || !Array.isArray(body.items) || body.items.length === 0) return missingParameter();
  if (!body.items.every(isValidItem) || !hasOrigin(body) || !hasDestination(body)) return missingParameter();

  const originPostal = postalCodeOf(body.origin_area_id, body.origin_postal_code);
  const destinationPostal = postalCodeOf(body.destination_area_id, body.destination_postal_code);
  if (originPostal === "invalid" || destinationPostal === "invalid") return invalidPostalCode();
  if ((originPostal !== null && !regionOf(originPostal)) || (destinationPostal !== null && !regionOf(destinationPostal))) return invalidPostalCode();

  const zone = zoneOf(originPostal, destinationPostal);
  const kg = chargeableKg(body.items);
  const insuredValue = isNumber(body.courier_insurance) && body.courier_insurance > 0 ? body.courier_insurance : 0;
  const requested = new Set(body.couriers.split(",").map((code) => code.trim().toLowerCase()));

  const pricing: BiteshipPricingType[] = SERVICES.filter(
    (service) => requested.has(service.courier_code) && (service.maxZone === undefined || zone <= service.maxZone)
  ).map((service) => {
    const billedKg = Math.max(kg, service.minKg ?? 0);
    const shippingFee = roundUp(ZONE_RATE_PER_KG[zone] * service.rateFactor * billedKg, 500);
    const insuranceFee = insuredValue ? service.insurance(insuredValue) : 0;
    const [minDays, maxDays] = service.maxZone !== undefined ? [1, 1] : ZONE_DAYS[zone].map((days) => days + service.extraDays);
    const range = minDays === maxDays ? String(minDays) : `${minDays} - ${maxDays}`;
    return {
      available_collection_method: ["pickup"],
      available_for_cash_on_delivery: false,
      available_for_proof_of_delivery: false,
      available_for_instant_waybill_id: true,
      available_for_insurance: true,
      company: service.courier_code,
      courier_name: service.courier_name,
      courier_code: service.courier_code,
      courier_service_name: service.courier_service_name,
      courier_service_code: service.courier_service_code,
      currency: "IDR",
      description: service.description,
      duration: `${range} days`,
      shipment_duration_range: range,
      shipment_duration_unit: "days",
      service_type: service.service_type,
      shipping_type: service.shipping_type,
      shipping_fee: shippingFee,
      shipping_fee_discount: 0,
      shipping_fee_surcharge: 0,
      insurance_fee: insuranceFee,
      cash_on_delivery_fee: 0,
      price: shippingFee + insuranceFee,
      tax_lines: [],
      type: service.courier_service_code,
    };
  });
  if (pricing.length === 0) return noCourier();

  return {
    status: 200,
    data: {
      success: true,
      object: "courier_pricing",
      message: "Success to retrieve courier pricing",
      code: 20001007,
      origin: location(originPostal, body.origin_latitude, body.origin_longitude),
      destination: location(destinationPostal, body.destination_latitude, body.destination_longitude),
      pricing,
    },
  };
};

// Layanan per kurir akun Ortic (GET /v1/couriers), untuk pilihan layanan di Manajemen Kurir.
const knownCourierServices = (): Record<string, { code: string; name: string; description: string }[]> => {
  const result: Record<string, { code: string; name: string; description: string }[]> = {};
  for (const service of SERVICES) {
    (result[service.courier_code] ??= []).push({ code: service.courier_service_code, name: service.courier_service_name, description: service.description });
  }
  return result;
};

export { mockRates, knownCourierServices };
