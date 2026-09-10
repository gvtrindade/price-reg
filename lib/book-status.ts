export const BOOK_STATUSES = {
  registered: "registered",
  error: "error",
  not_found: "not_found",
} as const;

export type BookStatus = (typeof BOOK_STATUSES)[keyof typeof BOOK_STATUSES];

/** Message key under the `BookStatus` namespace, per status value. */
export const BOOK_STATUS_LABEL_KEYS: Record<BookStatus, string> = {
  registered: "registered",
  error: "error",
  not_found: "notFound",
};

/** Statuses whose valuation can be re-run via the reprocess action/webhook. */
export const REPROCESSABLE_STATUSES: readonly string[] = [
  BOOK_STATUSES.registered,
  BOOK_STATUSES.error,
  BOOK_STATUSES.not_found,
];
