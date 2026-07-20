/**
 * Numeric clamp helpers (pure).
 */

/** Integer clamp via bitwise floor toward zero for the value first. */
export const clampInt = (n: number, min: number, max: number): number => {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n | 0));
};

/** Inclusive float clamp. */
export const clamp = (n: number, min: number, max: number): number => {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};
