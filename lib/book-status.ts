export enum BookStatus {
  REGISTERED = "registered",
  ERROR = "error",
  NOT_FOUND = "not_found",
  QUEUED = "queued",
  PRINTING = "printing",
  PRINTED = "printed",
}

export const BOOK_STATUS_LABEL_KEYS: Record<BookStatus, string> = {
  [BookStatus.REGISTERED]: "registered",
  [BookStatus.ERROR]: "error",
  [BookStatus.NOT_FOUND]: "notFound",
  [BookStatus.QUEUED]: "queued",
  [BookStatus.PRINTING]: "printing",
  [BookStatus.PRINTED]: "printed",
};

export const REPROCESSABLE_STATUSES: readonly string[] = [
  BookStatus.REGISTERED,
  BookStatus.ERROR,
  BookStatus.NOT_FOUND,
];

export const PROCESSING_STATUSES: readonly string[] = [
  BookStatus.REGISTERED,
  BookStatus.ERROR,
];

export const PRINTING_QUEUED_STATUSES: readonly string[] = [
  BookStatus.REGISTERED,
  BookStatus.QUEUED,
];

export const PRINTING_IN_PROGRESS_STATUSES: readonly string[] = [
  BookStatus.PRINTING,
];

export const PRINTING_DONE_STATUSES: readonly string[] = [
  BookStatus.PRINTED,
];

export const EDITABLE_BOOK_STATUSES: readonly string[] = [
  BookStatus.REGISTERED,
  BookStatus.ERROR,
  BookStatus.NOT_FOUND,
];
