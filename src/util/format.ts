/**
 * Presentation number formatting (pure).
 */

/** Score / fun multiplier as `×1.25` (2 decimal places). */
export const formatTimesMult = (mult: number): string => {
  const n = Number.isFinite(mult) ? mult : 0;
  return `×${n.toFixed(2)}`;
};

/** Fixed 2-decimal string (no × prefix) for i18n interpolation params. */
export const formatFactor = (factor: number): string => {
  const n = Number.isFinite(factor) ? factor : 0;
  return n.toFixed(2);
};

/** Percent 0–100 as integer string with % suffix. */
export const formatPercent = (pct: number): string => {
  const n = Number.isFinite(pct) ? Math.round(pct) : 0;
  return `${n}%`;
};
