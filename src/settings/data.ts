/**
 * Wipe local app data and Cache Storage (PWA / workbox).
 */
import { SETTINGS_KEY } from "./types";
import { resetCurrentSettingsToDefaults } from "./store";

/** localStorage keys owned by this app (settings, locale, high scores). */
const isAppStorageKey = (key: string): boolean =>
  key === SETTINGS_KEY ||
  key === "puzzleSekaiLocale" ||
  key === "highScore_endless" ||
  key.startsWith("highScore_endless_") ||
  key.startsWith("highScore_timeAttack_");

/**
 * Wipe app local data: settings, locale, and all high-score records.
 * Resets the in-memory settings singleton to defaults.
 */
export function clearAppData(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isAppStorageKey(key)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    console.warn("Failed to clear app data:", e);
  }
  resetCurrentSettingsToDefaults();
}

/**
 * Delete Cache Storage entries (PWA / workbox audio & font caches, etc.).
 * Does not touch localStorage.
 */
export async function clearAppCaches(): Promise<number> {
  if (typeof caches === "undefined") return 0;
  try {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
    return names.length;
  } catch (e) {
    console.warn("Failed to clear caches:", e);
    return 0;
  }
}
