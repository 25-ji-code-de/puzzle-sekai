/**
 * Shared effective (skill) score: strips multiplier and normalizes duration
 * to a 90s density baseline. Used by ScoreRank and dan rating.
 */
import type { GameMode } from "../settings";

/** Time-attack / density baseline in seconds. */
export const PERFORMANCE_BASELINE_SECONDS = 90;

/** Endless lower clamp — prevents instant quit from inflating density. */
export const ENDLESS_DURATION_MIN = 30;

/** Endless upper clamp — prevents multi-hour AFK from zeroing density to noise. */
export const ENDLESS_DURATION_MAX = 600;

export type EffectiveScoreInput = {
  score: number;
  multiplier: number;
  mode: GameMode;
  /** Required for accurate TA normalization; defaults to 90. */
  timeAttackDuration?: number;
  /**
   * Wall-clock match length in seconds.
   * Endless: used for density normalization (clamped).
   * Time Attack: ignored (configured duration is used instead).
   */
  playedSeconds?: number;
};

const safeScore = (score: number): number =>
  Number.isFinite(score) ? Math.max(0, score) : 0;

const safeMult = (multiplier: number): number =>
  Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 0.01;

/**
 * Performance score comparable across difficulty multipliers and durations.
 *   effective = score / mult
 *   TA:      × (90 / duration)
 *   Endless: × (90 / clamp(playedSeconds, 30, 600)); missing → 90
 */
export function effectiveScore(input: EffectiveScoreInput): number {
  let e = safeScore(input.score) / safeMult(input.multiplier);

  if (input.mode === "timeAttack") {
    const duration =
      Number.isFinite(input.timeAttackDuration) &&
      (input.timeAttackDuration as number) > 0
        ? (input.timeAttackDuration as number)
        : PERFORMANCE_BASELINE_SECONDS;
    e *= PERFORMANCE_BASELINE_SECONDS / duration;
  } else {
    const raw =
      Number.isFinite(input.playedSeconds) &&
      (input.playedSeconds as number) > 0
        ? (input.playedSeconds as number)
        : PERFORMANCE_BASELINE_SECONDS;
    const t = Math.min(
      ENDLESS_DURATION_MAX,
      Math.max(ENDLESS_DURATION_MIN, raw),
    );
    e *= PERFORMANCE_BASELINE_SECONDS / t;
  }

  return e;
}
