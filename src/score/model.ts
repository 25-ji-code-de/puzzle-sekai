/**
 * Pure score / combo / timer model (no PIXI).
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

export const addDropScore = (points: number) => {
  const mult = getScoreMultiplier(getCurrentSettings());
  _score += Math.round(points * mult);
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

  const mode = getCurrentGameMode();
  const isNewHigh = saveHighScore(mode, _score, settings);
  if (isNewHigh) {
    _highScore = _score;
    _highScoreDifficulty = getDifficultyLevel(settings);
    _highScoreEntertainment = isEntertainmentMode(settings);
  }
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
