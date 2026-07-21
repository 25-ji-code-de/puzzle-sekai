/**
 * Pure easing curves (unit t in [0, 1] recommended; not clamped).
 */

/** Quadratic ease-in: slow start, accelerates (tip pry / gravity lever). */
export const easeInQuad = (t: number): number => t * t;

/** Quadratic ease-out: fast start, decelerates. */
export const easeOutQuad = (t: number): number => t * (2 - t);

/** Linear (identity) — named for call-site clarity. */
export const easeLinear = (t: number): number => t;
