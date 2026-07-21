/**
 * Client-side merge for pico dan + high scores.
 * Pure — no storage / network.
 */
import { DAN_RUN_CAP, type DanRunEntry, type DanState } from "../score/dan";
import type { HighScoreRecord } from "../settings";
import { emptyPicoSyncData, type PicoSyncData } from "./types";
import { clampInt } from "../util/clamp";
import { maxOf } from "../util/minmax";
import { toFiniteNumber, toNonNegInt } from "../util/number";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

export const isBetterHighScore = (
  a: HighScoreRecord,
  b: HighScoreRecord,
): boolean => {
  if (a.score !== b.score) return a.score > b.score;
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt;
  if (a.difficultyLevel !== b.difficultyLevel) {
    return a.difficultyLevel > b.difficultyLevel;
  }
  // Prefer standard over entertainment on ties
  if (a.entertainment !== b.entertainment) return !a.entertainment;
  return false;
};

export const mergeHighScores = (
  local: Record<string, HighScoreRecord>,
  cloud: Record<string, HighScoreRecord>,
): Record<string, HighScoreRecord> => {
  const keys = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  const out: Record<string, HighScoreRecord> = {};
  for (const k of keys) {
    const L = local[k];
    const C = cloud[k];
    if (L && C) {
      out[k] = isBetterHighScore(L, C) ? L : C;
    } else if (L) {
      out[k] = L;
    } else if (C) {
      out[k] = C;
    }
  }
  return out;
};

export const mergeDanStates = (local: DanState, cloud: DanState): DanState => {
  const byId = new Map<string, DanRunEntry>();
  for (const r of cloud.runs || []) {
    if (r?.id) byId.set(r.id, r);
  }
  for (const r of local.runs || []) {
    if (!r?.id) continue;
    const prev = byId.get(r.id);
    if (!prev || r.playedAt >= prev.playedAt) byId.set(r.id, r);
  }
  const runs = Array.from(byId.values()).sort(
    (a, b) => a.playedAt - b.playedAt,
  );
  const trimmed =
    runs.length > DAN_RUN_CAP ? runs.slice(runs.length - DAN_RUN_CAP) : runs;
  const peakFromRuns = maxOf(
    trimmed.map((r) => r.maxCombo || 0),
    0,
  );
  const maxComboPeak = maxOf(
    [local.maxComboPeak || 0, cloud.maxComboPeak || 0, peakFromRuns],
    0,
  );
  return { version: 1, runs: trimmed, maxComboPeak };
};

export const mergePicoData = (
  local: PicoSyncData,
  cloud: PicoSyncData | null,
): PicoSyncData => {
  if (!cloud) {
    return {
      schema: 1,
      dan: {
        version: 1,
        runs: [...(local.dan?.runs || [])],
        maxComboPeak: local.dan?.maxComboPeak || 0,
      },
      highScores: { ...(local.highScores || {}) },
    };
  }
  return {
    schema: 1,
    dan: mergeDanStates(local.dan, cloud.dan),
    highScores: mergeHighScores(local.highScores || {}, cloud.highScores || {}),
  };
};

/** Parse unknown cloud JSON into PicoSyncData or null. */
export const parsePicoSyncData = (raw: unknown): PicoSyncData | null => {
  if (!isRecord(raw)) return null;
  if (raw.schema !== 1 && raw.schema != null) {
    // Future schemas: still try best-effort if dan/highScores present
  }
  const danRaw = isRecord(raw.dan) ? raw.dan : null;
  const runsIn = Array.isArray(danRaw?.runs) ? danRaw!.runs : [];
  const runs: DanRunEntry[] = [];
  for (const r of runsIn) {
    if (!isRecord(r)) continue;
    const id = String(r.id || "");
    const score = toFiniteNumber(r.score, Number.NaN);
    const playedAt = toFiniteNumber(r.playedAt, Number.NaN);
    if (!id || !Number.isFinite(score) || score <= 0) continue;
    if (!Number.isFinite(playedAt) || playedAt <= 0) continue;
    const mult = toFiniteNumber(r.multiplier, 1);
    const multSafe = mult > 0 ? mult : 1;
    const storedEffective = toFiniteNumber(r.effectiveScore, Number.NaN);
    const entry: DanRunEntry = {
      id,
      playedAt,
      mode: r.mode === "timeAttack" ? "timeAttack" : "endless",
      timeAttackDuration:
        r.timeAttackDuration === 60 ||
        r.timeAttackDuration === 90 ||
        r.timeAttackDuration === 120 ||
        r.timeAttackDuration === 180
          ? r.timeAttackDuration
          : undefined,
      score: Math.floor(score),
      maxCombo: toNonNegInt(r.maxCombo),
      difficulty: clampInt(
        toNonNegInt(r.difficulty, 1),
        1,
        7,
      ) as DanRunEntry["difficulty"],
      entertainment: r.entertainment === true,
      multiplier: multSafe,
      scoreRank: String(r.scoreRank || "D") as DanRunEntry["scoreRank"],
      rating: toNonNegInt(r.rating),
    };
    if (Number.isFinite(storedEffective) && storedEffective > 0) {
      entry.effectiveScore = storedEffective;
    }
    const playedSeconds = toFiniteNumber(r.playedSeconds, Number.NaN);
    if (Number.isFinite(playedSeconds) && playedSeconds > 0) {
      entry.playedSeconds = playedSeconds;
    }
    runs.push(entry);
  }
  const hsRaw = isRecord(raw.highScores) ? raw.highScores : {};
  const highScores: Record<string, HighScoreRecord> = {};
  for (const [k, v] of Object.entries(hsRaw)) {
    if (!k.startsWith("hs:")) continue;
    if (!isRecord(v)) continue;
    const score = toNonNegInt(v.score);
    if (score <= 0) continue;
    highScores[k] = {
      score,
      difficultyLevel: toNonNegInt(v.difficultyLevel),
      entertainment: v.entertainment === true,
      updatedAt: toNonNegInt(v.updatedAt),
    };
  }
  const maxComboPeak = maxOf(
    [toNonNegInt(danRaw?.maxComboPeak), ...runs.map((r) => r.maxCombo)],
    0,
  );
  return {
    schema: 1,
    dan: { version: 1, runs, maxComboPeak },
    highScores,
  };
};

export const ensurePico = (d: PicoSyncData | null | undefined): PicoSyncData =>
  d ? mergePicoData(d, null) : emptyPicoSyncData();
