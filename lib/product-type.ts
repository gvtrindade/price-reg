import { ProductType } from "@/prisma/generated/enums";

export { ProductType };

export const PRODUCT_TYPE_OPTIONS: readonly ProductType[] = [
  ProductType.BOOK,
  ProductType.CD,
  ProductType.DVD,
];

export const PRODUCT_TYPE_LABEL_KEYS: Record<ProductType, "book" | "cd" | "dvd"> = {
  [ProductType.BOOK]: "book",
  [ProductType.CD]: "cd",
  [ProductType.DVD]: "dvd",
};

/** Value sent to the price finder API. */
export function productTypeApiValue(type: ProductType): "book" | "cd" | "dvd" {
  return PRODUCT_TYPE_LABEL_KEYS[type];
}
