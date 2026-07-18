/**
 * Collect local dan + high-score buckets into PicoSyncData.
 */
import { loadDanState } from "../score/dan-store";
import { parseRecord } from "../settings/high-score";
import { getStoragePort } from "../settings/storage";
import type { HighScoreRecord } from "../settings";
import type { PicoSyncData } from "./types";

export const exportLocalPicoData = (): PicoSyncData => {
  const dan = loadDanState();
  const highScores: Record<string, HighScoreRecord> = {};
  const storage = getStoragePort();
  for (const key of storage.keys()) {
    if (!key.startsWith("hs:endless:") && !key.startsWith("hs:timeAttack:")) {
      continue;
    }
    const rec = parseRecord(storage.get(key));
    if (rec.score > 0) highScores[key] = rec;
  }
  return {
    schema: 1,
    dan: {
      version: 1,
      runs: [...dan.runs],
      maxComboPeak: dan.maxComboPeak,
    },
    highScores,
  };
};
