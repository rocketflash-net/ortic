import { BiteshipAreaType } from "@@types/biteship.type";

type AreaResponseType = {
  id: string;
  label: string;
  province: string;
  city: string;
  district: string;
  postal_code: string;
};

// Area Biteship dalam bentuk yang langsung bisa mengisi form alamat (gudang / alamat pembeli).
export default class AreaDto {
  static fromBiteship(area: BiteshipAreaType): AreaResponseType {
    return {
      id: area.id,
      label: area.name,
      province: area.administrative_division_level_1_name,
      city: area.administrative_division_level_2_name,
      district: area.administrative_division_level_3_name,
      postal_code: String(area.postal_code),
    };
  }

  static collection(areas: BiteshipAreaType[]): AreaResponseType[] {
    return areas.map(AreaDto.fromBiteship);
  }
}
