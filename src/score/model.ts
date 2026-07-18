/**
 * Pure score / combo / timer model (no PIXI).
 * High-score storage is deferred via flushHighScoreIfNeeded().
 */
import {
  DifficultyLevel,
  getCurrentGameMode,
  getCurrentSettings,
  getDifficultyLabel,
  getDifficultyLevel,
  getScoreMultiplier,
  isEntertainmentMode,
  loadHighScoreRecord,
  saveHighScore,
} from "../settings";

let _score = 0;
let _highScore = 0;
let _highScoreDifficulty = 0;
let _highScoreEntertainment = false;
let _combo = 0;
let _maxCombo = 0;
let _timeRemaining = 0;

/** Optional UI refresh hooks registered by the HUD module. */
let onScoreChanged: (() => void) | null = null;
let onTimerChanged: (() => void) | null = null;

let lifecycleBound = false;

export const bindScoreHud = (hooks: {
  onScoreChanged: () => void;
  onTimerChanged: () => void;
}) => {
  onScoreChanged = hooks.onScoreChanged;
  onTimerChanged = hooks.onTimerChanged;
};

export const getScore = () => _score;
export const getHighScore = () => _highScore;
export const getHighScoreDifficulty = () => _highScoreDifficulty;
export const getHighScoreEntertainment = () => _highScoreEntertainment;
export const getCombo = () => _combo;
export const getTimeRemaining = () => _timeRemaining;

export const setTimeRemaining = (seconds: number) => {
  _timeRemaining = Math.max(0, seconds);
  onTimerChanged?.();
};

/** Set timer without HUD refresh (used while building the display). */
export const seedTimeRemaining = (seconds: number) => {
  _timeRemaining = Math.max(0, seconds);
};

export const decrementTime = (): boolean => {
  _timeRemaining--;
  onTimerChanged?.();
  return _timeRemaining <= 0;
};

/** Raise in-memory high-score fields for the HUD only (no storage write). */
const maybeRaiseMemoryHigh = () => {
  if (_score <= _highScore) return;
  const settings = getCurrentSettings();
  _highScore = _score;
  _highScoreDifficulty = getDifficultyLevel(settings);
  _highScoreEntertainment = isEntertainmentMode(settings);
};

export const addDropScore = (points: number) => {
  const mult = getScoreMultiplier(getCurrentSettings());
  _score += Math.round(points * mult);
  maybeRaiseMemoryHigh();
  onScoreChanged?.();
};

export const addScore = (piecesCleared: number) => {
  _combo++;
  if (_combo > _maxCombo) _maxCombo = _combo;
  const baseScore = piecesCleared * 10;
  const comboBonus = _combo > 1 ? _combo * 5 : 0;
  const settings = getCurrentSettings();
  const mult = getScoreMultiplier(settings);
  _score += Math.round((baseScore + comboBonus) * mult);
  maybeRaiseMemoryHigh();
  onScoreChanged?.();
};

export const resetCombo = () => {
  _combo = 0;
  onScoreChanged?.();
};

export const resetScore = () => {
  _score = 0;
  _combo = 0;
  _maxCombo = 0;
  _timeRemaining = 0;
  onScoreChanged?.();
};

/** Load high-score record for the HUD at match start. */
export const loadMatchHighScore = () => {
  const mode = getCurrentGameMode();
  const settings = getCurrentSettings();
  const record = loadHighScoreRecord(mode, settings);
  _highScore = record.score;
  _highScoreDifficulty = record.difficultyLevel;
  _highScoreEntertainment = record.entertainment;
};

/**
 * Persist the current run score if it beats the stored bucket.
 * Call on game over, return-to-menu, restart, and page hide.
 */
export const flushHighScoreIfNeeded = (): boolean => {
  try {
    if (_score <= 0) return false;
    const mode = getCurrentGameMode();
    const settings = getCurrentSettings();
    const isNewHigh = saveHighScore(mode, _score, settings);
    if (isNewHigh) {
      _highScore = _score;
      _highScoreDifficulty = getDifficultyLevel(settings);
      _highScoreEntertainment = isEntertainmentMode(settings);
      onScoreChanged?.();
    }
    return isNewHigh;
  } catch {
    return false;
  }
};

/**
 * Bind once: flush on tab hide / page teardown paths.
 * Covers refresh, tab close, app background on most browsers.
 * Does NOT cover hard process kills (browser crash, OS kill, power loss).
 */
export const bindHighScoreLifecycle = () => {
  if (lifecycleBound || typeof window === "undefined") return;
  lifecycleBound = true;
  const flush = () => {
    flushHighScoreIfNeeded();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  // pagehide: modern unload/bfcache path. beforeunload: extra belt for refresh/close.
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
};

export const getScoreSummary = () => ({
  score: _score,
  highScore: _highScore,
  highScoreDifficulty: _highScoreDifficulty,
  highScoreEntertainment: _highScoreEntertainment,
  highScoreLabel:
    _highScoreDifficulty >= 1 && _highScoreDifficulty <= 7
      ? getDifficultyLabel(_highScoreDifficulty as DifficultyLevel)
      : "",
  maxCombo: _maxCombo,
  timeRemaining: _timeRemaining,
});
