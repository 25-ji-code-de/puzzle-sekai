/**
 * Pure helpers for a11y match announcements (no DOM / score model).
 */
export const TIME_CRITICAL_SEC = 10;

/** mm:ss clock for remaining seconds (floored, never negative). */
export const formatTimerClock = (sec: number): string => {
  const safe = Number.isFinite(sec) ? Math.max(0, Math.floor(sec)) : 0;
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

/**
 * Whether to fire a time-low assertive announce.
 * Above critical threshold: no. Same second as last: no.
 */
export const shouldAnnounceTimeLow = (
  sec: number,
  lastAnnouncedSec: number,
  criticalSec: number = TIME_CRITICAL_SEC,
): boolean => {
  if (!Number.isFinite(sec) || sec > criticalSec) return false;
  return sec !== lastAnnouncedSec;
};

/** Combo > 1 → score+combo line; else score only. */
export const scoreAnnounceKind = (combo: number): "score" | "scoreCombo" =>
  combo > 1 ? "scoreCombo" : "score";

/**
 * Whether a debounced score announce should speak (values changed).
 */
export const shouldSpeakScore = (
  score: number,
  combo: number,
  lastScore: number,
  lastCombo: number,
): boolean => score !== lastScore || combo !== lastCombo;
