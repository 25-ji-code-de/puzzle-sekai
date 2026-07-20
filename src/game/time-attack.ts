/**
 * Pure time-attack clock math (no ticker / PIXI).
 * Wall-clock deadline via performance.now() scale; UI shows ceil seconds.
 */
export type TimeAttackSnapshot = {
  /** Absolute deadline (performance.now scale). 0 = not running. */
  endsAt: number;
  /** Remaining ms held while paused. 0 when running or stopped. */
  pausedRemainingMs: number;
};

export const emptyTimeAttackSnapshot = (): TimeAttackSnapshot => ({
  endsAt: 0,
  pausedRemainingMs: 0,
});

/** Whole seconds left for the HUD (ceil so the last second still shows 1). */
export const displaySecondsFromMs = (remainingMs: number): number =>
  remainingMs <= 0 ? 0 : Math.ceil(remainingMs / 1000);

export const remainingMsAt = (endsAt: number, nowMs: number): number =>
  endsAt > 0 ? endsAt - nowMs : 0;

export const startTimeAttackClock = (
  durationSec: number,
  nowMs: number,
): TimeAttackSnapshot => ({
  endsAt: nowMs + durationSec * 1000,
  pausedRemainingMs: 0,
});

export const pauseTimeAttackClock = (
  snap: TimeAttackSnapshot,
  nowMs: number,
): TimeAttackSnapshot => {
  if (!snap.endsAt) return snap;
  return {
    endsAt: 0,
    pausedRemainingMs: Math.max(0, snap.endsAt - nowMs),
  };
};

export const resumeTimeAttackClock = (
  snap: TimeAttackSnapshot,
  nowMs: number,
): TimeAttackSnapshot => {
  if (snap.endsAt || snap.pausedRemainingMs <= 0) return snap;
  return {
    endsAt: nowMs + snap.pausedRemainingMs,
    pausedRemainingMs: 0,
  };
};

export const stopTimeAttackClock = (): TimeAttackSnapshot =>
  emptyTimeAttackSnapshot();

/** True when running clock has expired at `nowMs`. */
export const isTimeAttackExpired = (
  snap: TimeAttackSnapshot,
  nowMs: number,
): boolean => snap.endsAt > 0 && snap.endsAt - nowMs <= 0;
