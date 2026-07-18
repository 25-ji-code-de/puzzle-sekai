/**
 * Cloud blob shape for gateway project=pico.
 */
import type { DanState } from "../score/dan";
import type { HighScoreRecord } from "../settings";

export type PicoSyncData = {
  schema: 1;
  dan: DanState;
  /** Full localStorage keys → records (e.g. hs:endless:4:std) */
  highScores: Record<string, HighScoreRecord>;
};

export type SyncMeta = {
  version: number;
  updatedAt: number;
};

export const emptyPicoSyncData = (): PicoSyncData => ({
  schema: 1,
  dan: { version: 1, runs: [], maxComboPeak: 0 },
  highScores: {},
});
