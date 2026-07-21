/**
 * UTC date key formatting (pure; injectable Date for tests).
 */

/** Format a Date as UTC `YYYY-MM-DD`. */
export const formatUtcDateKey = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** True if string looks like a UTC date key (no calendar validation). */
export const isUtcDateKeyFormat = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
