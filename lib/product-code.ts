/**
 * Products are not typed in the database: the code shape only decides which
 * lookup flow runs. Books carry ISBNs -- ISBN-10s, or ISBN-13s (EAN-13 with the
 * Bookland prefix 978/979). Any other EAN/UPC barcode belongs to a CD or DVD.
 */
const BOOK_CODE_RE = /^(?:97[89]\d{10}|\d{9}[\dXx])$/;

export function isBookCode(code: string): boolean {
  return BOOK_CODE_RE.test(code.replace(/[-\s]/g, ""));
}
