/**
 * Safe JSON parse helpers (pure — no storage).
 */

/** Parse JSON string; on failure return `fallback` (default null). */
export const safeJsonParse = <T = unknown>(
  raw: string | null | undefined,
  fallback: T | null = null,
): T | null => {
  if (raw == null || raw === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};
