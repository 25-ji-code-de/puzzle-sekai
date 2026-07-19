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
  type GroupName,
} from "../settings";
import { computeScoreRank } from "./rank";
import { effectiveScore } from "./performance";
import {
  recordDanRun,
  resetDanSessionLatch,
  type RecordDanRunResult,
} from "./dan-store";

/** Soft/hard drop contribution factor after the final score mult. */
export const DROP_SCORE_FACTOR = 0.6;

/** Chain mult cap so endless mega-cascades don't explode. */
export const CHAIN_MULT_CAP = 4;

let _score = 0;
let _highScore = 0;
let _highScoreDifficulty = 0;
let _highScoreEntertainment = false;
let _combo = 0;
let _maxCombo = 0;
let _timeRemaining = 0;
/** Latched from the last flushHighScoreIfNeeded(); not derived from score===highScore. */
let _isNewRecord = false;
/** Per-unit clear events this run (not cell counts). Fun-only scores do not increment. */
let _groupClears: Partial<Record<GroupName, number>> = {};
/** performance.now() at match start (resetScore); 0 if unset. */
let _matchStartedAt = 0;

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

/** Wall-clock seconds since resetScore (0 if clock not started). */
export const getPlayedSeconds = (): number => {
  if (!_matchStartedAt || typeof performance === "undefined") return 0;
  return Math.max(0, (performance.now() - _matchStartedAt) / 1000);
};

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
  _score += Math.round(points * mult * DROP_SCORE_FACTOR);
  maybeRaiseMemoryHigh();
  onScoreChanged?.();
};

/**
 * Chain multiplier: combo 1 → ×1; each extra step +0.2, capped at CHAIN_MULT_CAP.
 * combo 5 → ×1.8; combo 10 → ×2.8; combo 16+ → ×4.
 */
export const chainMultiplierOf = (combo: number): number => {
  const c = Number.isFinite(combo) ? Math.max(1, Math.floor(combo)) : 1;
  if (c <= 1) return 1;
  return Math.min(CHAIN_MULT_CAP, 1 + 0.2 * (c - 1));
};

export const addScore = (piecesCleared: number) => {
  _combo++;
  if (_combo > _maxCombo) _maxCombo = _combo;
  const baseScore = piecesCleared * 10;
  const chainMult = chainMultiplierOf(_combo);
  const settings = getCurrentSettings();
  const mult = getScoreMultiplier(settings);
  _score += Math.round(baseScore * chainMult * mult);
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
  _isNewRecord = false;
  _groupClears = {};
  _matchStartedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  // New match may record a fresh dan run after the next game-over.
  resetDanSessionLatch();
  onScoreChanged?.();
};

/**
 * Append this run to the account dan log (once per match).
 * Call from beginGameOver after flushHighScoreIfNeeded.
 */
export const finalizeRunForDan = (): RecordDanRunResult => {
  const summary = getScoreSummary();
  return recordDanRun({
    mode: summary.mode,
    timeAttackDuration:
      summary.mode === "timeAttack"
        ? getCurrentSettings().timeAttackDuration
        : undefined,
    score: summary.score,
    maxCombo: summary.maxCombo,
    difficulty: summary.difficulty,
    entertainment: summary.entertainment,
    multiplier: summary.multiplier,
    scoreRank: summary.scoreRank,
    effectiveScore: summary.effectiveScore,
    playedSeconds: summary.playedSeconds,
  });
};

/** Count one completed unit clear event (grid or continuous). */
export const recordGroupClear = (group: GroupName) => {
  _groupClears[group] = (_groupClears[group] ?? 0) + 1;
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
    if (_score <= 0) {
      _isNewRecord = false;
      return false;
    }
    const mode = getCurrentGameMode();
    const settings = getCurrentSettings();
    const isNewHigh = saveHighScore(mode, _score, settings);
    _isNewRecord = isNewHigh;
    if (isNewHigh) {
      _highScore = _score;
      _highScoreDifficulty = getDifficultyLevel(settings);
      _highScoreEntertainment = isEntertainmentMode(settings);
      onScoreChanged?.();
    }
    return isNewHigh;
  } catch {
    _isNewRecord = false;
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

export const getScoreSummary = () => {
  const settings = getCurrentSettings();
  const difficulty = getDifficultyLevel(settings);
  const entertainment = isEntertainmentMode(settings);
  const mode = getCurrentGameMode();
  const multiplier = getScoreMultiplier(settings);
  const playedSeconds = getPlayedSeconds();
  const effective = effectiveScore({
    score: _score,
    multiplier,
    mode,
    timeAttackDuration: settings.timeAttackDuration,
    playedSeconds,
  });
  return {
    score: _score,
    maxCombo: _maxCombo,
    timeRemaining: _timeRemaining,
    mode,
    difficulty,
    difficultyLabel: getDifficultyLabel(difficulty),
    entertainment,
    multiplier,
    highScore: _highScore,
    highScoreDifficulty: _highScoreDifficulty,
    highScoreEntertainment: _highScoreEntertainment,
    highScoreLabel:
      _highScoreDifficulty >= 1 && _highScoreDifficulty <= 7
        ? getDifficultyLabel(_highScoreDifficulty as DifficultyLevel)
        : "",
    isNewRecord: _isNewRecord,
    groupClears: { ..._groupClears } as Partial<Record<GroupName, number>>,
    selectedGroups: [...settings.selectedGroups] as GroupName[],
    playedSeconds,
    effectiveScore: effective,
    scoreRank: computeScoreRank({
      score: _score,
      multiplier,
      mode,
      timeAttackDuration: settings.timeAttackDuration,
      playedSeconds,
    }),
  };
};

export type ScoreSummary = ReturnType<typeof getScoreSummary>;
