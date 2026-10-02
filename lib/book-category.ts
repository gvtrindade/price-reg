export const BOOK_CATEGORIES = {
  religion: "religion",
  literature: "literature",
  sociology: "sociology",
  self_help: "self_help",
  law: "law",
  health: "health",
  culture: "culture",
  studies: "studies",
  foreign: "foreign",
  languages: "languages",
} as const;

export type BookCategory = (typeof BOOK_CATEGORIES)[keyof typeof BOOK_CATEGORIES];

export const BOOK_CATEGORY_LABEL_KEYS: Record<BookCategory, string> = {
  religion: "religion",
  literature: "literature",
  sociology: "sociology",
  self_help: "selfHelp",
  law: "law",
  health: "health",
  culture: "culture",
  studies: "studies",
  foreign: "foreign",
  languages: "languages",
};

export const BOOK_CATEGORY_OPTIONS = Object.entries(BOOK_CATEGORIES).map(
  ([value]) => ({
    value,
    labelKey: BOOK_CATEGORY_LABEL_KEYS[value as BookCategory],
  }),
);
