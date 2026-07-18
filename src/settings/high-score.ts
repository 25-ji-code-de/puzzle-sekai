/**
 * High-score persistence — one JSON record per
 * mode × (time-attack duration) × difficulty × std|ent bucket.
 */
import type {
  DifficultyLevel,
  GameMode,
  GameSettings,
  HighScoreRecord,
  TimeAttackDuration,
} from "./types";
import { getDifficultyLevel, isEntertainmentMode } from "./difficulty";
import { getCurrentSettings } from "./store";
import { getStoragePort } from "./storage";

const DIFFICULTIES: DifficultyLevel[] = [1, 2, 3, 4, 5, 6, 7];
const ENT_TAGS = ["std", "ent"] as const;

export function emptyRecord(): HighScoreRecord {
  return { score: 0, difficultyLevel: 0, entertainment: false, updatedAt: 0 };
}

const entTag = (entertainment: boolean): "std" | "ent" =>
  entertainment ? "ent" : "std";

/** Bucket key: hs:endless:{d}:{std|ent} | hs:timeAttack:{dur}:{d}:{std|ent} */
export function getHighScoreKey(
  mode: GameMode,
  difficulty: number,
  entertainment: boolean,
  settings?: GameSettings,
): string {
  const tag = entTag(entertainment);
  const d = Math.min(7, Math.max(1, difficulty | 0));
  if (mode === "endless") return `hs:endless:${d}:${tag}`;
  const duration = settings?.timeAttackDuration || 90;
  return `hs:timeAttack:${duration}:${d}:${tag}`;
}

export function parseRecord(raw: string | null): HighScoreRecord {
  if (!raw) return emptyRecord();
  try {
    // New format: JSON object
    if (raw.startsWith("{")) {
      const obj = JSON.parse(raw) as Partial<HighScoreRecord>;
      const score = Number(obj.score) || 0;
      const difficultyLevel = Number(obj.difficultyLevel) || 0;
      const entertainment = obj.entertainment === true;
      const updatedAt = Number(obj.updatedAt) || 0;
      return { score, difficultyLevel, entertainment, updatedAt };
    }
    // Defensive: plain number string
    const score = parseInt(raw, 10) || 0;
    return { ...emptyRecord(), score };
  } catch {
    return emptyRecord();
  }
}

function resolveSettings(settings?: GameSettings): GameSettings {
  return settings ?? getCurrentSettings();
}

function durationOf(
  mode: GameMode,
  settings?: GameSettings,
): TimeAttackDuration | null {
  if (mode === "endless") return null;
  return (settings?.timeAttackDuration || 90) as TimeAttackDuration;
}

function legacyScoreKey(
  mode: GameMode,
  duration: TimeAttackDuration | null,
): string {
  if (mode === "endless") return "highScore_endless";
  return `highScore_timeAttack_${duration}`;
}

/**
 * One-shot migration of the old 3-key layout into a single JSON bucket.
 * Legacy difficulty 0 / missing → ★1. Safe to re-run (keys removed after).
 */
function ensureMigrated(mode: GameMode, settings?: GameSettings): void {
  const duration = durationOf(mode, settings);
  const storage = getStoragePort();
  const scoreKey = legacyScoreKey(mode, duration);
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
    difficultyLevel: Math.min(7, Math.max(1, difficulty | 0)),
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
