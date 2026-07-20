/**
 * DEV-only console helpers. Production stays quiet for best-effort paths.
 */

/** Warn in development only (no-op in production builds). */
export const devWarn = (msg: string, err?: unknown): void => {
  if (!import.meta.env.DEV) return;
  if (err !== undefined) console.warn(msg, err);
  else console.warn(msg);
};
