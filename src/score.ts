import * as PIXI from "pixi.js-legacy";
import { app } from ".";
import {
  DifficultyLevel,
  getCurrentGameMode,
  getCurrentSettings,
  getDifficultyLabel,
  getDifficultyLevel,
  getDifficultyColor,
  getScoreMultiplier,
  isEntertainmentMode,
  loadHighScoreRecord,
  saveHighScore,
} from "./settings";
import { t, onLocaleChange } from "./i18n";
import { resolveFontScheme } from "./fonts";

let _score = 0;
let _highScore = 0;
let _highScoreDifficulty = 0;
let _highScoreEntertainment = false;
let _combo = 0;
let _maxCombo = 0;

// Time attack timer
let _timeRemaining = 0;

export const getScore = () => _score;
export const getHighScore = () => _highScore;
export const getCombo = () => _combo;
export const getTimeRemaining = () => _timeRemaining;

let scoreText: PIXI.Container;
let highScoreText: PIXI.Container;
let comboText: PIXI.Container;
let timerText: PIXI.Container;
let multBadge: PIXI.Container | undefined;

const SCORE_X = 1700;
const pad = (n: number, len: number) => String(n).padStart(len, "0");

const makePaddedText = (
  num: number,
  len: number,
  color: number,
  fontSize: number,
) => {
  const container = new PIXI.Container();

  const padded = pad(num, len);
  const firstNonZero = padded.search(/[^0]/);
  const grayPart = firstNonZero === -1 ? padded : padded.slice(0, firstNonZero);
  const colorPart = firstNonZero === -1 ? "" : padded.slice(firstNonZero);

  const numericFont = resolveFontScheme("numericStrong");
  const baseStyle = {
    fontSize,
    fontWeight: numericFont.fontWeight,
    fontFamily: numericFont.fontFamily,
    letterSpacing: 2,
  } as const;

  if (grayPart) {
    const grayText = new PIXI.Text(grayPart, { ...baseStyle, fill: 0x666666 });
    grayText.anchor.set(0, 0.5);
    container.addChild(grayText);
  }
  if (colorPart) {
    const colorText = new PIXI.Text(colorPart, { ...baseStyle, fill: color });
    colorText.anchor.set(0, 0.5);
    const grayTextObj = container.children[0] as PIXI.Text | undefined;
    if (grayTextObj) {
      colorText.x = grayTextObj.width;
    }
    container.addChild(colorText);
  }

  return container;
};

// Format time as MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${pad(secs, 2)}`;
};

const TIMER_FONT_SIZE = 48;

// Create time display text
const makeTimeText = (seconds: number, fontSize: number) => {
  const timeStr = formatTime(seconds);
  const color = seconds <= 10 ? 0xff4444 : seconds <= 30 ? 0xffaa44 : 0xffffff;

  const container = new PIXI.Container();
  const numericFont = resolveFontScheme("numericStrong");
  const text = new PIXI.Text(timeStr, {
    fontSize,
    fontWeight: numericFont.fontWeight,
    fontFamily: numericFont.fontFamily,
    fill: color,
  });
  text.anchor.set(0, 0.5);
  container.addChild(text);
  return container;
};

const replaceDisplay = (
  current: PIXI.Container | undefined,
  next: PIXI.Container,
): PIXI.Container => {
  if (current) {
    next.x = current.x;
    next.y = current.y;
    app.stage.addChild(next);
    app.stage.removeChild(current);
    current.destroy();
  } else {
    app.stage.addChild(next);
  }
  return next;
};

/** Current-run multiplier line, e.g. "×1.20  FUN". */
const formatCurrentMultiplier = (mult: number) => {
  const parts = [`×${mult.toFixed(2)}`];
  if (isEntertainmentMode(getCurrentSettings())) {
    parts.push(t("hsTags.entCompact"));
  }
  return parts.join("  ");
};

/** High-score metadata line, e.g. "纪录 Hard · 娱乐". */
const formatRecordDescription = (hsDiff: number, hsEnt: boolean) => {
  const parts: string[] = [];
  if (hsDiff >= 1 && hsDiff <= 7) {
    parts.push(getDifficultyLabel(hsDiff as DifficultyLevel));
  }
  if (hsEnt) {
    parts.push(t("hsTags.entertainment"));
  }
  return parts.length > 0 ? `${t("hsTags.record")} ${parts.join(" · ")}` : "";
};

const makeMultiplierBadge = (mult: number, hsDiff: number, hsEnt: boolean) => {
  const container = new PIXI.Container();
  const color = getBadgeColor(hsDiff);
  const numericFont = resolveFontScheme("numericStrong");
  const currentText = new PIXI.Text(formatCurrentMultiplier(mult), {
    fontSize: 18,
    fontFamily: numericFont.fontFamily,
    fontWeight: numericFont.fontWeight,
    fill: color,
    align: "center",
  });
  currentText.anchor.set(0.5, 0.5);
  currentText.y = 0;
  container.addChild(currentText);

  const record = formatRecordDescription(hsDiff, hsEnt);
  if (record) {
    const bodyFont = resolveFontScheme("body");
    const recordText = new PIXI.Text(record, {
      fontSize: 14,
      fontFamily: bodyFont.fontFamily,
      fontWeight: bodyFont.fontWeight,
      fill: color,
      align: "center",
    });
    recordText.anchor.set(0.5, 0.5);
    recordText.alpha = 0.82;
    recordText.y = 21;
    container.addChild(recordText);
  }

  return container;
};

/** Badge color: difficulty color if high-score has a known level, else default blue */
const getBadgeColor = (hsDiff: number): number => {
  if (hsDiff >= 1 && hsDiff <= 7) {
    const hex = getDifficultyColor(hsDiff);
    return parseInt(hex.replace("#", ""), 16);
  }
  return 0xaaccff;
};

export const initScoreDisplay = () => {
  // Clean up old displays
  if (scoreText) {
    app.stage.removeChild(scoreText);
    scoreText.destroy();
  }
  if (highScoreText) {
    app.stage.removeChild(highScoreText);
    highScoreText.destroy();
  }
  if (comboText) {
    app.stage.removeChild(comboText);
    comboText.destroy();
  }
  if (timerText) {
    app.stage.removeChild(timerText);
    timerText.destroy();
  }
  if (multBadge) {
    app.stage.removeChild(multBadge);
    multBadge.destroy({ children: true });
    multBadge = undefined;
  }

  const mode = getCurrentGameMode();
  const settings = getCurrentSettings();
  const mult = getScoreMultiplier(settings);

  // Load high score record for current mode
  const record = loadHighScoreRecord(mode, settings);
  _highScore = record.score;
  _highScoreDifficulty = record.difficultyLevel;
  _highScoreEntertainment = record.entertainment;

  scoreText = makePaddedText(_score, 8, 0xff6b8a, 44);
  scoreText.x = SCORE_X;
  scoreText.y = 660;
  scoreText.pivot.x = scoreText.width / 2;
  app.stage.addChild(scoreText);

  highScoreText = makePaddedText(_highScore, 8, 0xffffff, 36);
  highScoreText.x = SCORE_X;
  highScoreText.y = 745;
  highScoreText.pivot.x = highScoreText.width / 2;
  app.stage.addChild(highScoreText);

  // Current multiplier + high-score metadata, split by typography role.
  multBadge = makeMultiplierBadge(
    mult,
    _highScoreDifficulty,
    _highScoreEntertainment,
  );
  multBadge.x = SCORE_X;
  multBadge.y = 798;
  app.stage.addChild(multBadge);

  comboText = makePaddedText(_combo, 4, 0xffffff, 42);
  comboText.x = SCORE_X;
  comboText.y = 900;
  comboText.pivot.x = comboText.width / 2;
  app.stage.addChild(comboText);

  // Show timer for time attack mode
  if (mode === "timeAttack") {
    _timeRemaining = settings.timeAttackDuration;
    timerText = makeTimeText(_timeRemaining, TIMER_FONT_SIZE);
    timerText.x = SCORE_X + 50;
    timerText.y = 135;
    timerText.pivot.x = timerText.width / 2;
    app.stage.addChild(timerText);
  }
};

export const updateScoreDisplay = () => {
  if (scoreText) {
    const newScore = makePaddedText(_score, 8, 0xff6b8a, 44);
    newScore.pivot.x = newScore.width / 2;
    scoreText = replaceDisplay(scoreText, newScore);
  }
  if (highScoreText) {
    const newHigh = makePaddedText(_highScore, 8, 0xffffff, 36);
    newHigh.pivot.x = newHigh.width / 2;
    highScoreText = replaceDisplay(highScoreText, newHigh);
  }
  if (comboText) {
    const newCombo = makePaddedText(_combo, 4, 0xffffff, 42);
    newCombo.pivot.x = newCombo.width / 2;
    comboText = replaceDisplay(comboText, newCombo);
  }
  if (multBadge) {
    const settings = getCurrentSettings();
    const next = makeMultiplierBadge(
      getScoreMultiplier(settings),
      _highScoreDifficulty,
      _highScoreEntertainment,
    );
    multBadge = replaceDisplay(multBadge, next);
  }
};

onLocaleChange(() => {
  if (!multBadge) return;
  const settings = getCurrentSettings();
  const next = makeMultiplierBadge(
    getScoreMultiplier(settings),
    _highScoreDifficulty,
    _highScoreEntertainment,
  );
  multBadge = replaceDisplay(multBadge, next);
});

// Update timer display (for time attack mode)
export const updateTimerDisplay = () => {
  if (timerText) {
    const newTimer = makeTimeText(_timeRemaining, TIMER_FONT_SIZE);
    newTimer.pivot.x = newTimer.width / 2;
    timerText = replaceDisplay(timerText, newTimer);
  }
};

// Set time remaining (for time attack mode)
export const setTimeRemaining = (seconds: number) => {
  _timeRemaining = Math.max(0, seconds);
  updateTimerDisplay();
};

// Decrement time by 1 second (for time attack mode)
export const decrementTime = (): boolean => {
  _timeRemaining--;
  updateTimerDisplay();
  return _timeRemaining <= 0;
};

// Drop score: faster drops = more points (difficulty mult applied)
export const addDropScore = (points: number) => {
  const mult = getScoreMultiplier(getCurrentSettings());
  _score += Math.round(points * mult);
  updateScoreDisplay();
};

// Clear score: pieces cleared + combo bonus (difficulty mult applied)
export const addScore = (piecesCleared: number) => {
  _combo++;
  if (_combo > _maxCombo) _maxCombo = _combo;
  const baseScore = piecesCleared * 10;
  const comboBonus = _combo > 1 ? _combo * 5 : 0;
  const settings = getCurrentSettings();
  const mult = getScoreMultiplier(settings);
  _score += Math.round((baseScore + comboBonus) * mult);

  // Update high score (global per mode; store difficulty of this run)
  const mode = getCurrentGameMode();
  const isNewHigh = saveHighScore(mode, _score, settings);
  if (isNewHigh) {
    _highScore = _score;
    _highScoreDifficulty = getDifficultyLevel(settings);
    _highScoreEntertainment = isEntertainmentMode(settings);
  }
  updateScoreDisplay();
};

export const resetCombo = () => {
  _combo = 0;
  updateScoreDisplay();
};

export const resetScore = () => {
  _score = 0;
  _combo = 0;
  _maxCombo = 0;
  _timeRemaining = 0;
  updateScoreDisplay();
};

// Get final score summary (for game over screen)
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
