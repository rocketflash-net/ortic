import { WarehouseType } from "@@types/entity.type";

type WarehouseResponseType = {
  id: number;
  code: string;
  name: string;
  address: string;
  province: string;
  city: string;
  district: string | null;
  postal_code: string | null;
  biteship_area_id: string | null;
  latitude: number | null;
  longitude: number | null;
  pic_name: string | null;
  pic_phone: string | null;
  pickup_time: string;
  is_active: boolean;
  // Gudang baru bisa dipakai cek ongkir setelah area Biteship dipilih.
  is_shipping_ready: boolean;
  created_at: Date;
  updated_at: Date;
};

export default class WarehouseDto {
  static fromEntity(warehouse: WarehouseType): WarehouseResponseType {
    return {
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
      address: warehouse.address,
      province: warehouse.province,
      city: warehouse.city,
      district: warehouse.district,
      postal_code: warehouse.postalCode,
      biteship_area_id: warehouse.biteshipAreaId,
      latitude: warehouse.latitude,
      longitude: warehouse.longitude,
      pic_name: warehouse.picName,
      pic_phone: warehouse.picPhone,
      pickup_time: warehouse.pickupTime,
      is_active: warehouse.isActive,
      is_shipping_ready: warehouse.isActive && warehouse.biteshipAreaId !== null,
      created_at: warehouse.createdAt,
      updated_at: warehouse.updatedAt,
    };
  }

  static collection(warehouses: WarehouseType[]): WarehouseResponseType[] {
    return warehouses.map(WarehouseDto.fromEntity);
  }
}
