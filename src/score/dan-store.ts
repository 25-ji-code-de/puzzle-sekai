/**
 * Dan run-log persistence (localStorage via StoragePort).
 */
import {
  DAN_RUN_CAP,
  DAN_STORAGE_KEY,
  computeDanRating,
  compareDan,
  emptyDanState,
  runRating,
  type DanId,
  type DanRatingBreakdown,
  type DanRunEntry,
  type DanState,
} from "./dan";
import type { ScoreRank } from "./rank";
import type {
  DifficultyLevel,
  GameMode,
  TimeAttackDuration,
} from "../settings";
import { getStoragePort } from "../settings/storage";

export type RecordDanRunInput = {
  mode: GameMode;
  timeAttackDuration?: TimeAttackDuration;
  score: number;
  maxCombo: number;
  difficulty: number;
  entertainment: boolean;
  multiplier: number;
  scoreRank: ScoreRank;
  playedAt?: number;
};

export type DanSummary = DanRatingBreakdown & {
  maxComboPeak: number;
  runCount: number;
};

export type RecordDanRunResult = {
  recorded: boolean;
  before: DanSummary;
  after: DanSummary;
  promoted: boolean;
};

/** Latch so one match only contributes once even if finalize is re-called. */
let sessionRecorded = false;
/** Most recent recordDanRun outcome (for game-over “promoted” UI). */
let lastRecordResult: RecordDanRunResult | null = null;

export const resetDanSessionLatch = (): void => {
  sessionRecorded = false;
};

export const getLastDanRecordResult = (): RecordDanRunResult | null =>
  lastRecordResult;

const makeId = (playedAt: number, score: number): string => {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `${playedAt}-${score}-${Math.random().toString(36).slice(2, 9)}`;
};

const clampDifficulty = (d: number): DifficultyLevel =>
  Math.min(7, Math.max(1, Math.floor(d) || 1)) as DifficultyLevel;

const parseEntry = (raw: unknown): DanRunEntry | null => {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const score = Number(o.score);
  const rating = Number(o.rating);
  const playedAt = Number(o.playedAt);
  const maxCombo = Number(o.maxCombo);
  const difficulty = clampDifficulty(Number(o.difficulty));
  const multiplier = Number(o.multiplier);
  if (!Number.isFinite(score) || score <= 0) return null;
  if (!Number.isFinite(playedAt) || playedAt <= 0) return null;
  const mode: GameMode = o.mode === "timeAttack" ? "timeAttack" : "endless";
  const scoreRank = String(o.scoreRank || "D") as ScoreRank;
  const entry: DanRunEntry = {
    id: typeof o.id === "string" && o.id ? o.id : makeId(playedAt, score),
    playedAt,
    mode,
    score,
    maxCombo: Number.isFinite(maxCombo) ? Math.max(0, maxCombo) : 0,
    difficulty,
    entertainment: o.entertainment === true,
    multiplier: Number.isFinite(multiplier) ? multiplier : 1,
    scoreRank,
    rating: Number.isFinite(rating)
      ? Math.max(0, rating)
      : runRating(score, difficulty),
  };
  if (mode === "timeAttack") {
    const dur = Number(o.timeAttackDuration);
    if (dur === 60 || dur === 90 || dur === 120 || dur === 180) {
      entry.timeAttackDuration = dur;
    }
  }
  return entry;
};

export const parseDanState = (raw: string | null): DanState => {
  if (!raw) return emptyDanState();
  try {
    const obj = JSON.parse(raw) as Partial<DanState>;
    const runsIn = Array.isArray(obj.runs) ? obj.runs : [];
    const runs: DanRunEntry[] = [];
    for (const r of runsIn) {
      const e = parseEntry(r);
      if (e) runs.push(e);
    }
    runs.sort((a, b) => a.playedAt - b.playedAt);
    const trimmed =
      runs.length > DAN_RUN_CAP ? runs.slice(runs.length - DAN_RUN_CAP) : runs;
    const maxComboPeak = Math.max(
      0,
      Number(obj.maxComboPeak) || 0,
      ...trimmed.map((r) => r.maxCombo),
    );
    return { version: 1, runs: trimmed, maxComboPeak };
  } catch {
    return emptyDanState();
  }
};

export const loadDanState = (): DanState => {
  try {
    return parseDanState(getStoragePort().get(DAN_STORAGE_KEY));
  } catch {
    return emptyDanState();
  }
};

export const saveDanState = (state: DanState): void => {
  try {
    getStoragePort().set(DAN_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("[dan] save failed", e);
  }
};

export const summarizeDanState = (state: DanState): DanSummary => {
  const breakdown = computeDanRating(state.runs, state.maxComboPeak);
  return {
    ...breakdown,
    maxComboPeak: state.maxComboPeak,
    runCount: state.runs.length,
  };
};

export const getDanSummary = (): DanSummary =>
  summarizeDanState(loadDanState());

/**
 * Append one finished run (score > 0). Idempotent per session via latch.
 * Call once from beginGameOver after high-score flush.
 */
export const recordDanRun = (input: RecordDanRunInput): RecordDanRunResult => {
  const beforeState = loadDanState();
  const before = summarizeDanState(beforeState);

  if (sessionRecorded || !Number.isFinite(input.score) || input.score <= 0) {
    const skip: RecordDanRunResult = {
      recorded: false,
      before,
      after: before,
      promoted: false,
    };
    lastRecordResult = skip;
    return skip;
  }

  const playedAt =
    Number.isFinite(input.playedAt) && (input.playedAt as number) > 0
      ? (input.playedAt as number)
      : Date.now();
  const difficulty = clampDifficulty(input.difficulty);
  const rating = runRating(input.score, difficulty);
  if (rating <= 0) {
    const skip: RecordDanRunResult = {
      recorded: false,
      before,
      after: before,
      promoted: false,
    };
    lastRecordResult = skip;
    return skip;
  }

  const entry: DanRunEntry = {
    id: makeId(playedAt, input.score),
    playedAt,
    mode: input.mode,
    score: Math.floor(input.score),
    maxCombo: Math.max(0, Math.floor(input.maxCombo) || 0),
    difficulty,
    entertainment: input.entertainment === true,
    multiplier: Number.isFinite(input.multiplier) ? input.multiplier : 1,
    scoreRank: input.scoreRank,
    rating,
  };
  if (input.mode === "timeAttack" && input.timeAttackDuration) {
    entry.timeAttackDuration = input.timeAttackDuration;
  }

  const runs = [...beforeState.runs, entry];
  const trimmed =
    runs.length > DAN_RUN_CAP ? runs.slice(runs.length - DAN_RUN_CAP) : runs;
  const maxComboPeak = Math.max(beforeState.maxComboPeak, entry.maxCombo);
  const afterState: DanState = { version: 1, runs: trimmed, maxComboPeak };
  saveDanState(afterState);
  sessionRecorded = true;

  const after = summarizeDanState(afterState);
  const promoted = compareDan(after.dan, before.dan) > 0;
  const result: RecordDanRunResult = {
    recorded: true,
    before,
    after,
    promoted,
  };
  lastRecordResult = result;
  return result;
};

/** i18n key fragment for a dan id (`dan.beginner` etc.). */
export const danMessageKey = (dan: DanId): `dan.${DanId}` => `dan.${dan}`;
