/**
 * ScoreRank: performance letter grades + colors for settlement / share card.
 * Pure — no DOM/canvas. Ranks are Latin letters (no i18n).
 */
import type { GameMode } from "../settings";

export type ScoreRank =
  | "D"
  | "C"
  | "B"
  | "BB"
  | "BBB"
  | "A"
  | "AA"
  | "AAA"
  | "S"
  | "S+"
  | "SS"
  | "SS+"
  | "SSS"
  | "SSS+";

/** Low → high order (for display / iteration). */
export const SCORE_RANKS: readonly ScoreRank[] = [
  "D",
  "C",
  "B",
  "BB",
  "BBB",
  "A",
  "AA",
  "AAA",
  "S",
  "S+",
  "SS",
  "SS+",
  "SSS",
  "SSS+",
] as const;

/**
 * Effective-score lower bounds, high → low for first-match.
 * effective = score / mult; TA further × (90 / duration).
 */
const THRESHOLDS: readonly { rank: ScoreRank; min: number }[] = [
  { rank: "SSS+", min: 48_000 },
  { rank: "SSS", min: 36_000 },
  { rank: "SS+", min: 27_000 },
  { rank: "SS", min: 20_000 },
  { rank: "S+", min: 15_000 },
  { rank: "S", min: 11_000 },
  { rank: "AAA", min: 8_000 },
  { rank: "AA", min: 5_800 },
  { rank: "A", min: 4_000 },
  { rank: "BBB", min: 2_600 },
  { rank: "BB", min: 1_600 },
  { rank: "B", min: 900 },
  { rank: "C", min: 400 },
  { rank: "D", min: 0 },
];

/** Flat brand colors per rank (SSS+ uses gradient via SCORE_RANK_SSS_PLUS_GRADIENT). */
export const SCORE_RANK_COLORS: Record<ScoreRank, string> = {
  D: "#8a8f9c",
  C: "#b8c0cc",
  B: "#7dcc66",
  BB: "#55c98a",
  BBB: "#3dccb0",
  A: "#55aaff",
  AA: "#6b88ff",
  AAA: "#8877ff",
  S: "#ffd76a",
  "S+": "#ffc040",
  SS: "#ff9a4a",
  "SS+": "#ff6b8a",
  SSS: "#ff5a9a",
  "SSS+": "#ff88cc",
};

/** Pink → lavender gradient (same as Append difficulty). */
export const SCORE_RANK_SSS_PLUS_GRADIENT =
  "linear-gradient(90deg, #ff88cc, #ddbbff)";

const isScoreRank = (v: string): v is ScoreRank =>
  (SCORE_RANKS as readonly string[]).includes(v);

export type ComputeScoreRankInput = {
  score: number;
  multiplier: number;
  mode: GameMode;
  /** Required when mode is timeAttack; defaults to 90. */
  timeAttackDuration?: number;
};

/**
 * Map run performance to a letter rank.
 * Strips score multiplier so difficulty settings don't gate the grade;
 * Time Attack normalizes duration to a 90s baseline.
 */
export function computeScoreRank(input: ComputeScoreRankInput): ScoreRank {
  const score = Number.isFinite(input.score) ? Math.max(0, input.score) : 0;
  const mult =
    Number.isFinite(input.multiplier) && input.multiplier > 0
      ? input.multiplier
      : 0.01;
  let effective = score / mult;

  if (input.mode === "timeAttack") {
    const duration =
      Number.isFinite(input.timeAttackDuration) &&
      (input.timeAttackDuration as number) > 0
        ? (input.timeAttackDuration as number)
        : 90;
    effective *= 90 / duration;
  }

  for (const t of THRESHOLDS) {
    if (effective >= t.min) return t.rank;
  }
  return "D";
}

/** Flat hex color for a rank (canvas-friendly; SSS+ is the gradient start). */
export function getScoreRankColor(rank: ScoreRank | string): string {
  if (isScoreRank(rank)) return SCORE_RANK_COLORS[rank];
  return SCORE_RANK_COLORS.D;
}

/** CSS color or gradient string (SSS+ → gradient). */
export function getScoreRankCssColor(rank: ScoreRank | string): string {
  if (rank === "SSS+") return SCORE_RANK_SSS_PLUS_GRADIENT;
  return getScoreRankColor(rank);
}

/**
 * Inline CSS for DOM rank text (mirrors diffColorStyle for Append).
 * Includes a soft glow from the rank color.
 */
export function scoreRankColorStyle(rank: ScoreRank | string): string {
  const glow = getScoreRankGlow(rank);
  if (rank === "SSS+") {
    return (
      `background:${SCORE_RANK_SSS_PLUS_GRADIENT};` +
      `-webkit-background-clip:text;-webkit-text-fill-color:transparent;` +
      `background-clip:text;` +
      `filter:drop-shadow(0 0 10px ${glow});`
    );
  }
  const c = getScoreRankColor(rank);
  return `color:${c};text-shadow:0 0 14px ${glow};`;
}

/** rgba glow string for text-shadow / canvas shadowColor. */
export function getScoreRankGlow(rank: ScoreRank | string): string {
  const hex = getScoreRankColor(rank);
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return "rgba(255, 215, 106, 0.35)";
  const n = parseInt(raw, 16);
  if (Number.isNaN(n)) return "rgba(255, 215, 106, 0.35)";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, 0.4)`;
}
