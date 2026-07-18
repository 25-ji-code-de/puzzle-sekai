/**
 * Account dan rating: B30 + R10 + A → 初级…极传.
 * Pure math / colors — persistence lives in dan-store.ts.
 */
import type { DifficultyLevel, GameMode } from "../settings";
import type { ScoreRank } from "./rank";

export const DAN_STORAGE_KEY = "puzzleSekaiDan";
export const DAN_RUN_CAP = 100;
export const DAN_B30 = 30;
export const DAN_R10 = 10;

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
};

export type DanState = {
  version: 1;
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

/** Mild weight on top of already mult-scaled score. */
export const DIFFICULTY_WEIGHT: Record<DifficultyLevel, number> = {
  1: 0.9,
  2: 0.95,
  3: 1.0,
  4: 1.05,
  5: 1.12,
  6: 1.2,
  7: 1.3,
};

/** High → low for first-match. */
const DAN_THRESHOLDS: readonly { dan: DanId; min: number }[] = [
  { dan: "gokuden", min: 8_000_000 },
  { dan: "shinHiden", min: 5_200_000 },
  { dan: "shinKaiden", min: 3_400_000 },
  { dan: "hiden", min: 2_200_000 },
  { dan: "kaiden", min: 1_400_000 },
  { dan: "expert", min: 850_000 },
  { dan: "advanced", min: 450_000 },
  { dan: "intermediate", min: 200_000 },
  { dan: "beginner", min: 80_000 },
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
  version: 1,
  runs: [],
  maxComboPeak: 0,
});

export const isSOrAbove = (rank: ScoreRank | string): boolean =>
  S_OR_ABOVE.has(rank as ScoreRank);

export const difficultyWeight = (difficulty: number): number => {
  const d = Math.min(
    7,
    Math.max(1, Math.floor(difficulty) || 1),
  ) as DifficultyLevel;
  return DIFFICULTY_WEIGHT[d];
};

/** rating = round(score × weight); non-positive score → 0. */
export const runRating = (score: number, difficulty: number): number => {
  if (!Number.isFinite(score) || score <= 0) return 0;
  return Math.round(score * difficultyWeight(difficulty));
};

export const danFromTotal = (total: number): DanId => {
  const t = Number.isFinite(total) ? Math.max(0, total) : 0;
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

export const getDanGlow = (dan: DanId | string): string => {
  const hex = getDanColor(dan);
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return "rgba(255, 255, 255, 0.25)";
  const n = parseInt(raw, 16);
  if (Number.isNaN(n)) return "rgba(255, 255, 255, 0.25)";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, 0.4)`;
};

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
  const peak = Number.isFinite(maxComboPeak) ? Math.max(0, maxComboPeak) : 0;
  return Math.min(8_000, Math.floor(peak * 25));
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
  return Math.min(12_000, s * 400);
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
    Number.isFinite(r.rating) ? Math.max(0, r.rating) : 0,
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
