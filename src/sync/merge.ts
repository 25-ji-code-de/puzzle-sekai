/**
 * Client-side merge for pico dan + high scores.
 * Pure — no storage / network.
 */
import { DAN_RUN_CAP, type DanRunEntry, type DanState } from "../score/dan";
import type { HighScoreRecord } from "../settings";
import { emptyPicoSyncData, type PicoSyncData } from "./types";
import { clampInt, nonNegative } from "../util/clamp";
import { maxOf } from "../util/minmax";

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
    const score = Number(r.score);
    const playedAt = Number(r.playedAt);
    if (!id || !Number.isFinite(score) || score <= 0) continue;
    if (!Number.isFinite(playedAt) || playedAt <= 0) continue;
    const mult = Number.isFinite(Number(r.multiplier))
      ? Number(r.multiplier)
      : 1;
    const storedEffective = Number(r.effectiveScore);
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
      maxCombo: nonNegative(Math.floor(Number(r.maxCombo) || 0)),
      difficulty: clampInt(
        Math.floor(Number(r.difficulty) || 1),
        1,
        7,
      ) as DanRunEntry["difficulty"],
      entertainment: r.entertainment === true,
      multiplier: mult,
      scoreRank: String(r.scoreRank || "D") as DanRunEntry["scoreRank"],
      rating: nonNegative(Math.floor(Number(r.rating) || 0)),
    };
    if (Number.isFinite(storedEffective) && storedEffective > 0) {
      entry.effectiveScore = storedEffective;
    }
    const playedSeconds = Number(r.playedSeconds);
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
    const score = Number(v.score) || 0;
    if (score <= 0) continue;
    highScores[k] = {
      score,
      difficultyLevel: Number(v.difficultyLevel) || 0,
      entertainment: v.entertainment === true,
      updatedAt: Number(v.updatedAt) || 0,
    };
  }
  const maxComboPeak = Math.max(
    0,
    Number(danRaw?.maxComboPeak) || 0,
    ...runs.map((r) => r.maxCombo),
  );
  return {
    schema: 1,
    dan: { version: 1, runs, maxComboPeak },
    highScores,
  };
};

export const ensurePico = (d: PicoSyncData | null | undefined): PicoSyncData =>
  d ? mergePicoData(d, null) : emptyPicoSyncData();
