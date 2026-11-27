export const MEGA_BAZAR_EVENT_TITLE = "Mega Bazar 2026";

const priceFormatter = new Intl.NumberFormat("pt-BR", {
  minimumIntegerDigits: 2,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a stored decimal price as a Brazilian Real amount. Amounts below
 * R$ 10 keep a leading zero, and the cents are always shown.
 */
export function formatPrice(price: string): string {
  const value = Number(price);
  if (!Number.isFinite(value)) return "—";
  return `R$ ${priceFormatter.format(value)}`;
}
