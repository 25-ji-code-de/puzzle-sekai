/**
 * Write merged PicoSyncData into local StoragePort (dan + hs buckets).
 */
import { saveDanState } from "../score/dan-store";
import { getStoragePort } from "../settings/storage";
import type { PicoSyncData } from "./types";

export const importLocalPicoData = (data: PicoSyncData): void => {
  saveDanState({
    version: 1,
    runs: data.dan?.runs || [],
    maxComboPeak: data.dan?.maxComboPeak || 0,
  });

  const storage = getStoragePort();
  const incoming = data.highScores || {};

  // Remove local hs keys missing from merged set (merged is authoritative union).
  for (const key of storage.keys()) {
    if (!key.startsWith("hs:endless:") && !key.startsWith("hs:timeAttack:")) {
      continue;
    }
    if (!(key in incoming)) storage.remove(key);
  }

  for (const [key, rec] of Object.entries(incoming)) {
    if (!key.startsWith("hs:") || !rec || rec.score <= 0) continue;
    storage.set(
      key,
      JSON.stringify({
        score: rec.score,
        difficultyLevel: rec.difficultyLevel || 0,
        entertainment: !!rec.entertainment,
        updatedAt: rec.updatedAt || 0,
      }),
    );
  }
};
