export const MEGA_BAZAR_EVENT_TITLE = "Mega Bazar 2026";

const priceFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a stored decimal price as a Brazilian Real amount, always showing
 * two decimal places.
 */
export function formatPrice(price: string): string {
  const value = Number(price);
  if (!Number.isFinite(value)) return "—";
  return `R$ ${priceFormatter.format(value)}`;
}

/**
 * Lowercases and strips diacritics so searches ignore case and accents.
 */
export function normalizeSearchTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
