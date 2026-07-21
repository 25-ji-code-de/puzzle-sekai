/**
 * High-score persistence — one JSON record per
 * mode × (time-attack duration | daily date) × difficulty × std|ent bucket.
 */
import type {
  DifficultyLevel,
  GameMode,
  GameSettings,
  HighScoreRecord,
  TimeAttackDuration,
} from "./types";
import { getDifficultyLevel, isEntertainmentMode } from "./difficulty";
import { getActiveDailyDateKey, getCurrentSettings } from "./store";
import { getStoragePort } from "./storage";
import { utcDateKey } from "../domain/daily";
import { clampInt } from "../util/clamp";
import { safeJsonParse } from "../util/json";
import { toNonNegInt } from "../util/number";

const DIFFICULTIES: DifficultyLevel[] = [1, 2, 3, 4, 5, 6, 7];
const ENT_TAGS = ["std", "ent"] as const;

export function emptyRecord(): HighScoreRecord {
  return { score: 0, difficultyLevel: 0, entertainment: false, updatedAt: 0 };
}

const entTag = (entertainment: boolean): "std" | "ent" =>
  entertainment ? "ent" : "std";

/** UTC date key for daily high-score buckets. */
function dailyDateKeyForHs(): string {
  return getActiveDailyDateKey() ?? utcDateKey();
}

/**
 * Bucket key:
 * - hs:endless:{d}:{std|ent}
 * - hs:timeAttack:{dur}:{d}:{std|ent}
 * - hs:daily:{YYYY-MM-DD}:{d}:{std|ent}
 *
 * Pure builder (no store / clock). Prefer this in tests; {@link getHighScoreKey}
 * fills daily date + TA duration from live settings.
 */
export function highScoreBucketKey(
  mode: GameMode,
  difficulty: number,
  entertainment: boolean,
  opts?: { timeAttackDuration?: number; dailyDateKey?: string },
): string {
  const tag = entTag(entertainment);
  const d = clampInt(difficulty, 1, 7);
  if (mode === "endless") return `hs:endless:${d}:${tag}`;
  if (mode === "daily") {
    const dateKey = opts?.dailyDateKey || "1970-01-01";
    return `hs:daily:${dateKey}:${d}:${tag}`;
  }
  const duration = opts?.timeAttackDuration || 90;
  return `hs:timeAttack:${duration}:${d}:${tag}`;
}

export function getHighScoreKey(
  mode: GameMode,
  difficulty: number,
  entertainment: boolean,
  settings?: GameSettings,
): string {
  if (mode === "daily") {
    return highScoreBucketKey(mode, difficulty, entertainment, {
      dailyDateKey: dailyDateKeyForHs(),
    });
  }
  if (mode === "timeAttack") {
    return highScoreBucketKey(mode, difficulty, entertainment, {
      timeAttackDuration: settings?.timeAttackDuration || 90,
    });
  }
  return highScoreBucketKey(mode, difficulty, entertainment);
}

export function parseRecord(raw: string | null): HighScoreRecord {
  if (!raw) return emptyRecord();
  // New format: JSON object
  if (raw.startsWith("{")) {
    const obj = safeJsonParse<Partial<HighScoreRecord>>(raw);
    if (!obj) return emptyRecord();
    const score = toNonNegInt(obj.score);
    const difficultyLevel = toNonNegInt(obj.difficultyLevel);
    const entertainment = obj.entertainment === true;
    const updatedAt = toNonNegInt(obj.updatedAt);
    return { score, difficultyLevel, entertainment, updatedAt };
  }
  // Defensive: plain number string
  const score = toNonNegInt(raw);
  return { ...emptyRecord(), score };
}

function resolveSettings(settings?: GameSettings): GameSettings {
  return settings ?? getCurrentSettings();
}

function durationOf(
  mode: GameMode,
  settings?: GameSettings,
): TimeAttackDuration | null {
  if (mode !== "timeAttack") return null;
  return (settings?.timeAttackDuration || 90) as TimeAttackDuration;
}

function legacyScoreKey(
  mode: GameMode,
  duration: TimeAttackDuration | null,
): string | null {
  if (mode === "endless") return "highScore_endless";
  if (mode === "timeAttack") return `highScore_timeAttack_${duration}`;
  // daily has no legacy keys
  return null;
}

/**
 * One-shot migration of the old 3-key layout into a single JSON bucket.
 * Legacy difficulty 0 / missing → ★1. Safe to re-run (keys removed after).
 * No-op for daily (no legacy layout).
 */
function ensureMigrated(mode: GameMode, settings?: GameSettings): void {
  if (mode === "daily") return;
  const duration = durationOf(mode, settings);
  const storage = getStoragePort();
  const scoreKey = legacyScoreKey(mode, duration);
  if (!scoreKey) return;
  const legacyRaw = storage.get(scoreKey);
  if (legacyRaw == null) return;

  const score = parseInt(legacyRaw, 10) || 0;
  const diffRaw = storage.get(`${scoreKey}_difficulty`);
  const entRaw = storage.get(`${scoreKey}_entertainment`);
  let difficulty = parseInt(diffRaw || "0", 10) || 0;
  if (difficulty < 1 || difficulty > 7) difficulty = 1;
  const entertainment = entRaw === "1";

  if (score > 0) {
    const key = getHighScoreKey(mode, difficulty, entertainment, settings);
    const existing = parseRecord(storage.get(key));
    if (score > existing.score) {
      const record: HighScoreRecord = {
        score,
        difficultyLevel: difficulty,
        entertainment,
        updatedAt: Date.now(),
      };
      storage.set(key, JSON.stringify(record));
    }
  }

  storage.remove(scoreKey);
  storage.remove(`${scoreKey}_difficulty`);
  storage.remove(`${scoreKey}_entertainment`);
}

function loadBucket(
  mode: GameMode,
  difficulty: number,
  entertainment: boolean,
  settings?: GameSettings,
): HighScoreRecord {
  ensureMigrated(mode, settings);
  const key = getHighScoreKey(mode, difficulty, entertainment, settings);
  const record = parseRecord(getStoragePort().get(key));
  if (record.score <= 0) return emptyRecord();
  // Prefer key-derived meta if JSON disagrees.
  return {
    score: record.score,
    difficultyLevel: clampInt(difficulty, 1, 7),
    entertainment,
    updatedAt: record.updatedAt,
  };
}

/** Load the bucket matching current settings (mode + duration + ★ + std/ent). */
export function loadHighScoreRecord(
  mode: GameMode,
  settings?: GameSettings,
): HighScoreRecord {
  try {
    const s = resolveSettings(settings);
    const difficulty = getDifficultyLevel(s);
    const entertainment = isEntertainmentMode(s);
    return loadBucket(mode, difficulty, entertainment, s);
  } catch {
    return emptyRecord();
  }
}

export function loadHighScore(mode: GameMode, settings?: GameSettings): number {
  return loadHighScoreRecord(mode, settings).score;
}

function isBetter(a: HighScoreRecord, b: HighScoreRecord): boolean {
  if (a.score !== b.score) return a.score > b.score;
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt;
  if (a.difficultyLevel !== b.difficultyLevel)
    return a.difficultyLevel > b.difficultyLevel;
  // Prefer standard over entertainment on remaining ties.
  return Number(a.entertainment) < Number(b.entertainment);
}

/** Best absolute score across all 14 buckets for this mode(+duration). */
export function loadBestHighScoreRecord(
  mode: GameMode,
  settings?: GameSettings,
): HighScoreRecord {
  try {
    const s = resolveSettings(settings);
    ensureMigrated(mode, s);
    let best = emptyRecord();
    for (const d of DIFFICULTIES) {
      for (const tag of ENT_TAGS) {
        const rec = loadBucket(mode, d, tag === "ent", s);
        if (rec.score > 0 && isBetter(rec, best)) best = rec;
      }
    }
    return best;
  } catch {
    return emptyRecord();
  }
}

/**
 * Non-empty records for cycle UI, ordered difficulty 1→7, std then ent.
 */
export function listHighScoreRecords(
  mode: GameMode,
  settings?: GameSettings,
): HighScoreRecord[] {
  try {
    const s = resolveSettings(settings);
    ensureMigrated(mode, s);
    const out: HighScoreRecord[] = [];
    for (const d of DIFFICULTIES) {
      for (const tag of ENT_TAGS) {
        const rec = loadBucket(mode, d, tag === "ent", s);
        if (rec.score > 0) out.push(rec);
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Save into the current-settings bucket only. Single atomic setItem. */
export function saveHighScore(
  mode: GameMode,
  score: number,
  settings?: GameSettings,
): boolean {
  try {
    const s = resolveSettings(settings);
    ensureMigrated(mode, s);
    const difficulty = getDifficultyLevel(s);
    const entertainment = isEntertainmentMode(s);
    const current = loadBucket(mode, difficulty, entertainment, s);
    if (score > current.score) {
      const record: HighScoreRecord = {
        score,
        difficultyLevel: difficulty,
        entertainment,
        updatedAt: Date.now(),
      };
      getStoragePort().set(
        getHighScoreKey(mode, difficulty, entertainment, s),
        JSON.stringify(record),
      );
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
