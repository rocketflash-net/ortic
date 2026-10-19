import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .default(null)
    .transform((value) => (value === "" ? null : value));

// Area dari pencarian Biteship (GET /shipping/areas) mengisi province, city, district, postal_code, biteship_area_id.
const saveAddressSchema = z.object({
  label: optionalText(50),
  recipient_name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+62|62|0)8\d{7,12}$/, "phone must be an Indonesian mobile number")),
  address: z.string().trim().min(10).max(1000),
  province: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100),
  district: z.string().trim().min(1).max(100),
  postal_code: z.string().trim().regex(/^\d{5}$/, "postal_code must be 5 digits"),
  biteship_area_id: z.string().trim().min(1).max(64),
  notes: optionalText(255),
  is_default: z.boolean().default(false),
});

type SaveAddressInputType = z.infer<typeof saveAddressSchema>;

export { saveAddressSchema, type SaveAddressInputType };
