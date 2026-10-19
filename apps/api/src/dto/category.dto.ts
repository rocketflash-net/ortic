import { CategoryType } from "@@types/entity.type";

type CategoryResponseType = {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  // Warna tema kartu: red | yellow | blue.
  color: string | null;
};

export default class CategoryDto {
  static fromEntity(category: CategoryType): CategoryResponseType {
    return { id: category.id, parent_id: category.parentId, name: category.name, slug: category.slug, color: category.color };
  }

  static collection(categories: CategoryType[]): CategoryResponseType[] {
    return categories.map(CategoryDto.fromEntity);
  }
}
