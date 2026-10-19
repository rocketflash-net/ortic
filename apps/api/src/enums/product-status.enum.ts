const ProductStatusEnum = {
  draft: "draft",
  active: "active",
  archived: "archived",
} as const;

type ProductStatusType = (typeof ProductStatusEnum)[keyof typeof ProductStatusEnum];

const PRODUCT_STATUSES = Object.values(ProductStatusEnum) as [ProductStatusType, ...ProductStatusType[]];

export default ProductStatusEnum;
export { PRODUCT_STATUSES, type ProductStatusType };
