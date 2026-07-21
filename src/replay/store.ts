/**
 * Replay local-storage ring buffer (newest first, capped).
 */
import { getStoragePort } from "../settings/storage";
import {
  REPLAY_LIMIT,
  REPLAY_STORAGE_KEY,
  type ReplayEntry,
  type ReplaySummary,
} from "./types";
import { parseReplayEntry, sortReplaysNewestFirst } from "./parse";
import { safeJsonParse } from "../util/json";

export {
  isReplayInput,
  parseReplayEntry,
  sortReplaysNewestFirst,
} from "./parse";

export const loadReplayEntries = (): ReplayEntry[] => {
  const raw = getStoragePort().get(REPLAY_STORAGE_KEY);
  if (!raw) return [];
  const parsed = safeJsonParse<unknown>(raw);
  if (!Array.isArray(parsed)) return [];
  return sortReplaysNewestFirst(
    parsed.map(parseReplayEntry).filter(Boolean) as ReplayEntry[],
  ).slice(0, REPLAY_LIMIT);
};

const saveReplayEntries = (entries: ReplayEntry[]): void => {
  getStoragePort().set(
    REPLAY_STORAGE_KEY,
    JSON.stringify(sortReplaysNewestFirst(entries).slice(0, REPLAY_LIMIT)),
  );
};

export const appendReplayEntry = (entry: ReplayEntry): ReplayEntry[] => {
  const deduped = loadReplayEntries().filter((r) => r.id !== entry.id);
  const next = [entry, ...deduped].slice(0, REPLAY_LIMIT);
  saveReplayEntries(next);
  return next;
};

export const loadReplayEntry = (id: string): ReplayEntry | null =>
  loadReplayEntries().find((r) => r.id === id) ?? null;

export const clearReplayEntries = (): void => {
  getStoragePort().remove(REPLAY_STORAGE_KEY);
};

export const listReplaySummaries = (): ReplaySummary[] =>
  loadReplayEntries().map((r) => ({
    id: r.id,
    savedAt: r.savedAt,
    mode: r.mode,
    dailyDateKey: r.dailyDateKey,
    score: r.score,
    maxCombo: r.maxCombo,
    difficulty: r.difficulty,
    entertainment: r.entertainment,
    scoreRank: r.scoreRank,
    playedSeconds: r.playedSeconds,
    durationMs: r.durationMs,
  }));
