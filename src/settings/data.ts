/**
 * Wipe local app data and Cache Storage (PWA / workbox).
 */
import { SETTINGS_KEY } from "./types";
import { resetCurrentSettingsToDefaults } from "./store";
import { getStoragePort } from "./storage";
import { devWarn } from "../util/dev-log";

/** Keys owned by the app (auth intentionally excluded). Exported for tests. */
export const isAppStorageKey = (key: string): boolean =>
  key === SETTINGS_KEY ||
  key === "puzzleSekaiLocale" ||
  // Account dan run log (B30 + R10 + A)
  key === "puzzleSekaiDan" ||
  key === "puzzleSekaiReplays" ||
  // Sync version meta (keep tokens — auth keys intentionally excluded)
  key === "puzzleSekaiSyncMeta" ||
  // New bucket keys: hs:endless:… / hs:timeAttack:… / hs:daily:…
  key.startsWith("hs:endless:") ||
  key.startsWith("hs:timeAttack:") ||
  key.startsWith("hs:daily:") ||
  // Legacy 3-key layout (residual cleanup)
  key === "highScore_endless" ||
  key.startsWith("highScore_endless_") ||
  key.startsWith("highScore_timeAttack_");
// Note: puzzleSekaiAuth is intentionally NOT cleared so login survives "clear data".

export function clearAppData(): void {
  try {
    const storage = getStoragePort();
    storage
      .keys()
      .filter(isAppStorageKey)
      .forEach((key) => storage.remove(key));
  } catch (e) {
    devWarn("Failed to clear app data:", e);
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
    devWarn("Failed to clear caches:", e);
    return 0;
  }
}
