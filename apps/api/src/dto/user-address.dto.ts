import { UserAddressType } from "@@types/entity.type";

type UserAddressResponseType = {
  id: number;
  label: string | null;
  recipient_name: string;
  phone: string;
  address: string;
  province: string;
  city: string;
  district: string;
  postal_code: string;
  biteship_area_id: string;
  notes: string | null;
  is_default: boolean;
};

export default class UserAddressDto {
  static fromEntity(address: UserAddressType): UserAddressResponseType {
    return {
      id: address.id,
      label: address.label,
      recipient_name: address.recipientName,
      phone: address.phone,
      address: address.address,
      province: address.province,
      city: address.city,
      district: address.district,
      postal_code: address.postalCode,
      biteship_area_id: address.biteshipAreaId,
      notes: address.notes,
      is_default: address.isDefault,
    };
  }

  static collection(addresses: UserAddressType[]): UserAddressResponseType[] {
    return addresses.map(UserAddressDto.fromEntity);
  }
}
