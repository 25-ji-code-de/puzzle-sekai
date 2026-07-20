/**
 * Pure replay JSON parse / validation (no storage).
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
import {
  REPLAY_VERSION,
  type ReplayEntry,
  type ReplayInput,
  type ReplaySettingsSnapshot,
} from "./types";

export const isReplayInput = (value: unknown): value is ReplayInput => {
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

export const normalizeReplaySettings = (
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

/** Parse one replay entry from JSON; returns null if invalid / wrong version. */
export const parseReplayEntry = (raw: unknown): ReplayEntry | null => {
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

export const sortReplaysNewestFirst = (entries: ReplayEntry[]): ReplayEntry[] =>
  [...entries].sort((a, b) => b.savedAt - a.savedAt);
