// Tiga warna tema Ortic (feed Instagram), dipakai sebagai latar kartu produk per kategori.
const CategoryColorEnum = {
  red: "red",
  yellow: "yellow",
  blue: "blue",
} as const;

type CategoryColorType = (typeof CategoryColorEnum)[keyof typeof CategoryColorEnum];

const CATEGORY_COLORS = Object.values(CategoryColorEnum) as [CategoryColorType, ...CategoryColorType[]];

export default CategoryColorEnum;
export { CATEGORY_COLORS, type CategoryColorType };
