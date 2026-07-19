/**
 * Replay local-storage ring buffer (newest first, capped).
 */
import { normalizeFunModes } from "../fun/modes";
import {
  GAME_GROUPS,
  isItemDropRate,
  isSpawnOrientation,
  isSpeedLevel,
  isTimeAttackDuration,
  type GroupName,
} from "../settings/types";
import { getStoragePort } from "../settings/storage";
import {
  REPLAY_LIMIT,
  REPLAY_STORAGE_KEY,
  REPLAY_VERSION,
  type ReplayEntry,
  type ReplayInput,
  type ReplaySettingsSnapshot,
  type ReplaySummary,
} from "./types";

const isReplayInput = (value: unknown): value is ReplayInput => {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.t === "number" &&
    Number.isFinite(o.t) &&
    o.t >= 0 &&
    (o.a === "L" ||
      o.a === "R" ||
      o.a === "CW" ||
      o.a === "CCW" ||
      o.a === "HD" ||
      o.a === "SD" ||
      o.a === "ND" ||
      o.a === "LF")
  );
};

const normalizeGroups = (raw: unknown): GroupName[] => {
  if (!Array.isArray(raw)) return [...GAME_GROUPS];
  const filtered = raw.filter(
    (g): g is GroupName =>
      typeof g === "string" && (GAME_GROUPS as readonly string[]).includes(g),
  );
  return filtered.length >= 3 && filtered.length <= 5
    ? filtered
    : [...GAME_GROUPS];
};

const normalizeReplaySettings = (
  raw: unknown,
): ReplaySettingsSnapshot | null => {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const speedLevel = isSpeedLevel(o.speedLevel) ? o.speedLevel : null;
  const timeAttackDuration = isTimeAttackDuration(o.timeAttackDuration)
    ? o.timeAttackDuration
    : null;
  const itemDropRate = isItemDropRate(o.itemDropRate) ? o.itemDropRate : null;
  const spawnOrientation = isSpawnOrientation(o.spawnOrientation)
    ? o.spawnOrientation
    : null;
  if (
    !speedLevel ||
    !timeAttackDuration ||
    itemDropRate == null ||
    !spawnOrientation
  ) {
    return null;
  }
  return {
    speedLevel,
    timeAttackDuration,
    selectedGroups: normalizeGroups(o.selectedGroups),
    funModes: normalizeFunModes(o.funModes),
    itemDropRate,
    spawnOrientation,
  };
};

const parseReplay = (raw: unknown): ReplayEntry | null => {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== REPLAY_VERSION) return null;
  const settings = normalizeReplaySettings(o.settings);
  if (!settings) return null;
  const mode =
    o.mode === "timeAttack"
      ? "timeAttack"
      : o.mode === "daily"
        ? "daily"
        : o.mode === "endless"
          ? "endless"
          : null;
  if (!mode) return null;
  const inputs = Array.isArray(o.inputs) ? o.inputs.filter(isReplayInput) : [];
  const score = Number(o.score);
  const maxCombo = Number(o.maxCombo);
  const difficulty = Number(o.difficulty);
  const multiplier = Number(o.multiplier);
  const playedSeconds = Number(o.playedSeconds);
  const durationMs = Number(o.durationMs);
  const seed = Number(o.seed);
  const savedAt = Number(o.savedAt);
  if (
    !Number.isFinite(score) ||
    !Number.isFinite(maxCombo) ||
    !Number.isFinite(difficulty) ||
    !Number.isFinite(multiplier) ||
    !Number.isFinite(playedSeconds) ||
    !Number.isFinite(durationMs) ||
    !Number.isFinite(seed) ||
    !Number.isFinite(savedAt)
  ) {
    return null;
  }
  return {
    v: REPLAY_VERSION,
    id: typeof o.id === "string" && o.id ? o.id : `${savedAt}-${seed}`,
    savedAt,
    seed: seed >>> 0,
    mode,
    dailyDateKey:
      typeof o.dailyDateKey === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(o.dailyDateKey)
        ? o.dailyDateKey
        : undefined,
    settings,
    score: Math.max(0, Math.floor(score)),
    maxCombo: Math.max(0, Math.floor(maxCombo)),
    difficulty: Math.min(
      7,
      Math.max(1, Math.floor(difficulty)),
    ) as ReplayEntry["difficulty"],
    entertainment: o.entertainment === true,
    multiplier: multiplier > 0 ? multiplier : 1,
    scoreRank: typeof o.scoreRank === "string" ? o.scoreRank : "D",
    playedSeconds: Math.max(0, playedSeconds),
    durationMs: Math.max(0, Math.floor(durationMs)),
    inputs,
  };
};

const sortNewestFirst = (entries: ReplayEntry[]): ReplayEntry[] =>
  [...entries].sort((a, b) => b.savedAt - a.savedAt);

export const loadReplayEntries = (): ReplayEntry[] => {
  try {
    const raw = getStoragePort().get(REPLAY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sortNewestFirst(
      parsed.map(parseReplay).filter(Boolean) as ReplayEntry[],
    ).slice(0, REPLAY_LIMIT);
  } catch {
    return [];
  }
};

const saveReplayEntries = (entries: ReplayEntry[]): void => {
  getStoragePort().set(
    REPLAY_STORAGE_KEY,
    JSON.stringify(sortNewestFirst(entries).slice(0, REPLAY_LIMIT)),
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
