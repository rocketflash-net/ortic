import { z } from "zod";

const atLeastOneField = (input: object) => Object.keys(input).length > 0;

// Field dasar tanpa default, supaya update parsial tidak me-reset field yang tidak dikirim.
const warehouseFields = {
  code: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .regex(/^[A-Za-z0-9-]+$/, "code may only contain letters, numbers and dashes")
    .toUpperCase(),
  name: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(1000),
  province: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100),
  district: z.string().trim().max(100).nullable(),
  postal_code: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "postal_code must be 5 digits")
    .nullable(),
  biteship_area_id: z.string().trim().max(64).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  pic_name: z.string().trim().max(100).nullable(),
  pic_phone: z
    .string()
    .trim()
    .regex(/^\+?\d{8,15}$/, "pic_phone must be 8-15 digits")
    .nullable(),
  pickup_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "pickup_time must be HH:mm"),
  is_active: z.boolean(),
};

const createWarehouseSchema = z.object({
  ...warehouseFields,
  district: warehouseFields.district.default(null),
  postal_code: warehouseFields.postal_code.default(null),
  biteship_area_id: warehouseFields.biteship_area_id.default(null),
  latitude: warehouseFields.latitude.default(null),
  longitude: warehouseFields.longitude.default(null),
  pic_name: warehouseFields.pic_name.default(null),
  pic_phone: warehouseFields.pic_phone.default(null),
  pickup_time: warehouseFields.pickup_time.default("13:00"),
  is_active: warehouseFields.is_active.default(true),
});

const updateWarehouseSchema = z.object(warehouseFields).partial().refine(atLeastOneField, "Provide at least one field to update");

type CreateWarehouseInputType = z.infer<typeof createWarehouseSchema>;
type UpdateWarehouseInputType = z.infer<typeof updateWarehouseSchema>;

export { createWarehouseSchema, updateWarehouseSchema, type CreateWarehouseInputType, type UpdateWarehouseInputType };
