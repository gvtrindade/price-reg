export enum ProductStatus {
  ADDED = "added",
  REGISTERED = "registered",
  ERROR = "error",
  NOT_FOUND = "not_found",
  QUEUED = "queued",
  PRINTING = "printing",
  PRINTED = "printed",
}

export const PRODUCT_STATUS_LABEL_KEYS: Record<ProductStatus, string> = {
  [ProductStatus.ADDED]: "added",
  [ProductStatus.REGISTERED]: "registered",
  [ProductStatus.ERROR]: "error",
  [ProductStatus.NOT_FOUND]: "notFound",
  [ProductStatus.QUEUED]: "queued",
  [ProductStatus.PRINTING]: "printing",
  [ProductStatus.PRINTED]: "printed",
};

export const REPROCESSABLE_STATUSES: readonly string[] = [
  ProductStatus.ADDED,
  ProductStatus.REGISTERED,
  ProductStatus.ERROR,
  ProductStatus.NOT_FOUND,
];

export const PROCESSING_STATUSES: readonly string[] = [
  ProductStatus.ADDED,
  ProductStatus.REGISTERED,
  ProductStatus.ERROR,
];

export const PRINTING_QUEUED_STATUSES: readonly string[] = [
  ProductStatus.REGISTERED,
  ProductStatus.QUEUED,
];

export const PRINTING_IN_PROGRESS_STATUSES: readonly string[] = [
  ProductStatus.PRINTING,
];

export const PRINTING_DONE_STATUSES: readonly string[] = [
  ProductStatus.PRINTED,
];

export const EDITABLE_PRODUCT_STATUSES: readonly string[] = [
  ProductStatus.ADDED,
  ProductStatus.REGISTERED,
  ProductStatus.ERROR,
  ProductStatus.NOT_FOUND,
];
