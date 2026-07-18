/**
 * Wipe local app data and Cache Storage (PWA / workbox).
 */
import { SETTINGS_KEY } from "./types";
import { resetCurrentSettingsToDefaults } from "./store";
import { getStoragePort } from "./storage";

const isAppStorageKey = (key: string): boolean =>
  key === SETTINGS_KEY ||
  key === "puzzleSekaiLocale" ||
  // New bucket keys: hs:endless:… / hs:timeAttack:…
  key.startsWith("hs:endless:") ||
  key.startsWith("hs:timeAttack:") ||
  // Legacy 3-key layout (residual cleanup)
  key === "highScore_endless" ||
  key.startsWith("highScore_endless_") ||
  key.startsWith("highScore_timeAttack_");

export function clearAppData(): void {
  try {
    const storage = getStoragePort();
    storage
      .keys()
      .filter(isAppStorageKey)
      .forEach((key) => storage.remove(key));
  } catch (e) {
    console.warn("Failed to clear app data:", e);
  }
  resetCurrentSettingsToDefaults();
}

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
