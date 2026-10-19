import { BrandType } from "@@types/entity.type";

type BrandResponseType = { id: number; name: string; slug: string };

export default class BrandDto {
  static fromEntity(brand: BrandType): BrandResponseType {
    return { id: brand.id, name: brand.name, slug: brand.slug };
  }

  static collection(brands: BrandType[]): BrandResponseType[] {
    return brands.map(BrandDto.fromEntity);
  }
}
