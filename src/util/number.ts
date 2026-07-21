/**
 * Coerce unknown values to finite numbers (pure).
 */

/** Finite number, or `fallback` when non-finite / non-numeric. */
export const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** Non-negative integer floor; non-finite → `fallback` (default 0). */
export const toNonNegInt = (value: unknown, fallback = 0): number => {
  const n = toFiniteNumber(value, Number.NaN);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
};
