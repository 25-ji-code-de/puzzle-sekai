/**
 * Throttled match-status announcements for screen readers.
 * Keeps score/combo spam down during multi-clear cascades.
 */
import { t } from "../i18n";
import {
  getCombo,
  getScore,
  getTimeRemaining,
} from "../score/model";
import { announce } from "./live-region";

const SCORE_DEBOUNCE_MS = 700;
const TIME_CRITICAL_SEC = 10;

let scoreTimer: ReturnType<typeof setTimeout> | null = null;
let lastAnnouncedScore = -1;
let lastAnnouncedCombo = -1;
let lastAnnouncedTime = -1;
let matchLive = false;

const clearScoreTimer = () => {
  if (scoreTimer) {
    clearTimeout(scoreTimer);
    scoreTimer = null;
  }
};

/** Call when a match actually starts (after HUD is up). */
export const announceMatchStart = (mode: "endless" | "timeAttack"): void => {
  matchLive = true;
  lastAnnouncedScore = 0;
  lastAnnouncedCombo = 0;
  lastAnnouncedTime = -1;
  clearScoreTimer();
  const modeLabel =
    mode === "timeAttack" ? t("menu.timeAttack") : t("menu.endless");
  announce(t("a11y.matchStart", { mode: modeLabel }), {
    politeness: "assertive",
  });
};

/** Call on pause / resume / returnToMenu / game over teardown. */
export const announceMatchEnd = (): void => {
  matchLive = false;
  clearScoreTimer();
};

/** Debounced score + combo (polite). Safe to call on every score change. */
export const scheduleScoreAnnounce = (): void => {
  if (!matchLive) return;
  clearScoreTimer();
  scoreTimer = setTimeout(() => {
    scoreTimer = null;
    if (!matchLive) return;
    const score = getScore();
    const combo = getCombo();
    if (score === lastAnnouncedScore && combo === lastAnnouncedCombo) return;
    lastAnnouncedScore = score;
    lastAnnouncedCombo = combo;
    if (combo > 1) {
      announce(
        t("a11y.scoreCombo", {
          score: String(score),
          combo: String(combo),
        }),
      );
    } else {
      announce(t("a11y.score", { score: String(score) }));
    }
  }, SCORE_DEBOUNCE_MS);
};

/** Timer ticks — assertive only when ≤10s and value changed. */
export const announceTimerIfNeeded = (): void => {
  if (!matchLive) return;
  const sec = getTimeRemaining();
  if (sec > TIME_CRITICAL_SEC) {
    lastAnnouncedTime = sec;
    return;
  }
  if (sec === lastAnnouncedTime) return;
  lastAnnouncedTime = sec;
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  const time = `${mins}:${String(secs).padStart(2, "0")}`;
  announce(t("a11y.timeLow", { time }), { politeness: "assertive" });
};

export const announcePaused = (): void => {
  announce(t("a11y.paused"), { politeness: "assertive" });
};

export const announceResumed = (): void => {
  if (!matchLive) return;
  announce(t("a11y.resumed"), { politeness: "assertive" });
};

export const announceGameOver = (score: number): void => {
  matchLive = false;
  clearScoreTimer();
  announce(t("a11y.gameOver", { score: String(score) }), {
    politeness: "assertive",
  });
};

export const announceMenu = (): void => {
  matchLive = false;
  clearScoreTimer();
  announce(t("a11y.menu"), { politeness: "assertive" });
};
