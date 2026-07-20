/**
 * Account dan rating: B30 + R10 + A → 初级…极传.
 * Pure math / colors — persistence lives in dan-store.ts.
 *
 * Rating input is effective (skill) score × mild difficulty weight,
 * not raw mult-scaled score — aligned with ScoreRank philosophy.
 */
import type { DifficultyLevel, GameMode } from "../settings";
import type { ScoreRank } from "./rank";
import { clamp, clampInt, nonNegative } from "../util/clamp";
import { hexToRgba } from "../util/color";

export const DAN_STORAGE_KEY = "puzzleSekaiDan";
export const DAN_RUN_CAP = 100;
export const DAN_B30 = 30;
export const DAN_R10 = 10;

/** Current on-disk schema; v1 entries are lazily re-rated on load. */
export const DAN_STATE_VERSION = 2 as const;

export type DanId =
  | "none"
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert"
  | "kaiden"
  | "hiden"
  | "shinKaiden"
  | "shinHiden"
  | "gokuden";

/** Low → high for iteration / display. */
export const DAN_IDS: readonly DanId[] = [
  "none",
  "beginner",
  "intermediate",
  "advanced",
  "expert",
  "kaiden",
  "hiden",
  "shinKaiden",
  "shinHiden",
  "gokuden",
] as const;

export type DanRunEntry = {
  id: string;
  playedAt: number;
  mode: GameMode;
  timeAttackDuration?: 60 | 90 | 120 | 180;
  score: number;
  maxCombo: number;
  difficulty: DifficultyLevel;
  entertainment: boolean;
  multiplier: number;
  scoreRank: ScoreRank;
  rating: number;
  /** Skill score after mult strip + duration density (optional on legacy). */
  effectiveScore?: number;
  /** Wall-clock match length used for endless density (optional). */
  playedSeconds?: number;
};

export type DanState = {
  version: typeof DAN_STATE_VERSION | 1;
  runs: DanRunEntry[];
  maxComboPeak: number;
};

export type DanRatingBreakdown = {
  b30: number;
  r10: number;
  comboBonus: number;
  streakBonus: number;
  a: number;
  total: number;
  streak: number;
  dan: DanId;
  ornament: string;
};

/**
 * Mild skill weight on top of already de-multiplied effective score.
 * Narrow band so high ★ is a light bonus, not a second mult stack.
 */
export const DIFFICULTY_WEIGHT: Record<DifficultyLevel, number> = {
  1: 0.95,
  2: 0.98,
  3: 1.0,
  4: 1.02,
  5: 1.05,
  6: 1.08,
  7: 1.12,
};

/** Entertainment runs count at 90% toward account rating. */
export const ENTERTAINMENT_RATING_FACTOR = 0.9;

/**
 * High → low for first-match (effective-based ratings).
 * ~30 default-★4 runs: casual→beginner · regular→intermediate ·
 * skilled→advanced · expert→expert · elite→kaiden.
 */
const DAN_THRESHOLDS: readonly { dan: DanId; min: number }[] = [
  { dan: "gokuden", min: 2_100_000 },
  { dan: "shinHiden", min: 1_400_000 },
  { dan: "shinKaiden", min: 950_000 },
  { dan: "hiden", min: 650_000 },
  { dan: "kaiden", min: 400_000 },
  { dan: "expert", min: 240_000 },
  { dan: "advanced", min: 140_000 },
  { dan: "intermediate", min: 70_000 },
  { dan: "beginner", min: 25_000 },
  { dan: "none", min: 0 },
];

export const DAN_COLORS: Record<DanId, string> = {
  none: "#8a8f9c",
  beginner: "#7dcc66",
  intermediate: "#55aaff",
  advanced: "#ffd76a",
  expert: "#ff5577",
  kaiden: "#bb66ff",
  hiden: "#ddbbff",
  shinKaiden: "#ffc040",
  shinHiden: "#ff88cc",
  gokuden: "#f5f7ff",
};

/** 真·秘传 pink→lavender (same family as Append / SSS+). */
export const DAN_SHIN_HIDEN_GRADIENT =
  "linear-gradient(90deg, #ff88cc, #ddbbff)";

export const DAN_ORNAMENT: Record<DanId, string> = {
  none: "",
  beginner: "",
  intermediate: "",
  advanced: "",
  expert: "",
  kaiden: "",
  hiden: "",
  shinKaiden: "★",
  shinHiden: "★★",
  gokuden: "☽",
};

const S_OR_ABOVE: ReadonlySet<ScoreRank> = new Set([
  "S",
  "S+",
  "SS",
  "SS+",
  "SSS",
  "SSS+",
]);

export const emptyDanState = (): DanState => ({
  version: DAN_STATE_VERSION,
  runs: [],
  maxComboPeak: 0,
});

export const isSOrAbove = (rank: ScoreRank | string): boolean =>
  S_OR_ABOVE.has(rank as ScoreRank);

export const difficultyWeight = (difficulty: number): number => {
  const d = clampInt(difficulty, 1, 7) as DifficultyLevel;
  return DIFFICULTY_WEIGHT[d];
};

export type RunRatingInput = {
  /** De-multiplied, duration-normalized performance score. */
  effectiveScore: number;
  difficulty: number;
  entertainment?: boolean;
};

/**
 * rating = round(effective × skillWeight × (ent ? 0.9 : 1)).
 * Non-positive effective → 0.
 */
export const runRating = (input: RunRatingInput): number => {
  const effective = input.effectiveScore;
  if (!Number.isFinite(effective) || effective <= 0) return 0;
  let r = effective * difficultyWeight(input.difficulty);
  if (input.entertainment) r *= ENTERTAINMENT_RATING_FACTOR;
  return Math.round(r);
};

/**
 * Approximate effective from a legacy stored run (no duration density).
 * score / mult only — endless AFK inflation is accepted for old rows.
 */
export const legacyEffectiveFromRaw = (
  score: number,
  multiplier: number,
): number => {
  if (!Number.isFinite(score) || score <= 0) return 0;
  const mult = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  return score / mult;
};

export const danFromTotal = (total: number): DanId => {
  const t = Number.isFinite(total) ? nonNegative(total) : 0;
  for (const row of DAN_THRESHOLDS) {
    if (t >= row.min) return row.dan;
  }
  return "none";
};

export const danOrnament = (dan: DanId): string => DAN_ORNAMENT[dan] ?? "";

export const getDanColor = (dan: DanId | string): string =>
  DAN_COLORS[(dan as DanId) in DAN_COLORS ? (dan as DanId) : "none"];

export const getDanCssColor = (dan: DanId | string): string => {
  if (dan === "shinHiden") return DAN_SHIN_HIDEN_GRADIENT;
  return getDanColor(dan);
};

export const getDanGlow = (dan: DanId | string): string =>
  hexToRgba(getDanColor(dan), 0.4) ?? "rgba(255, 255, 255, 0.25)";

/** Inline style for DOM dan labels (gradient clip for 真·秘传). */
export const danColorStyle = (dan: DanId | string): string => {
  const glow = getDanGlow(dan);
  if (dan === "shinHiden") {
    return (
      `background:${DAN_SHIN_HIDEN_GRADIENT};` +
      `-webkit-background-clip:text;-webkit-text-fill-color:transparent;` +
      `background-clip:text;` +
      `filter:drop-shadow(0 0 8px ${glow});`
    );
  }
  return `color:${getDanColor(dan)};text-shadow:0 0 12px ${glow};`;
};

export const comboBonusOf = (maxComboPeak: number): number => {
  const peak = nonNegative(Number.isFinite(maxComboPeak) ? maxComboPeak : 0);
  return clamp(Math.floor(peak * 50), 0, 40_000);
};

/** Count trailing S+ runs (newest at end of array). */
export const sStreakOf = (runs: readonly DanRunEntry[]): number => {
  let streak = 0;
  for (let i = runs.length - 1; i >= 0; i--) {
    if (!isSOrAbove(runs[i].scoreRank)) break;
    streak++;
  }
  return streak;
};

export const streakBonusOf = (streak: number): number => {
  const s = Number.isFinite(streak) ? Math.max(0, Math.floor(streak)) : 0;
  return clamp(s * 1_500, 0, 60_000);
};

/**
 * B30 + R10 + A breakdown.
 * runs: oldest → newest. Same run may contribute to both B30 and R10.
 */
export const computeDanRating = (
  runs: readonly DanRunEntry[],
  maxComboPeak: number,
): DanRatingBreakdown => {
  const ratings = runs.map((r) =>
    nonNegative(Number.isFinite(r.rating) ? r.rating : 0),
  );

  const sortedDesc = [...ratings].sort((a, b) => b - a);
  const b30 = sortedDesc.slice(0, DAN_B30).reduce((sum, v) => sum + v, 0);

  const recent = ratings.slice(-DAN_R10);
  const r10 = recent.reduce((sum, v) => sum + v, 0);

  const streak = sStreakOf(runs);
  const comboBonus = comboBonusOf(maxComboPeak);
  const streakBonus = streakBonusOf(streak);
  const a = comboBonus + streakBonus;
  const total = b30 + r10 + a;
  const dan = danFromTotal(total);

  return {
    b30,
    r10,
    comboBonus,
    streakBonus,
    a,
    total,
    streak,
    dan,
    ornament: danOrnament(dan),
  };
};

export const compareDan = (a: DanId, b: DanId): number =>
  DAN_IDS.indexOf(a) - DAN_IDS.indexOf(b);
