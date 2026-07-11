import * as PIXI from "pixi.js-legacy";
import { app } from ".";
import { GameMode, getCurrentGameMode, getCurrentSettings, loadHighScore, saveHighScore } from "./settings";

let _score = 0;
let _highScore = 0;
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

const SCORE_X = 1700;
const pad = (n: number, len: number) => String(n).padStart(len, "0");

const makePaddedText = (num: number, len: number, color: number, fontSize: number) => {
  const container = new PIXI.Container();

  const padded = pad(num, len);
  const firstNonZero = padded.search(/[^0]/);
  const grayPart = firstNonZero === -1 ? padded : padded.slice(0, firstNonZero);
  const colorPart = firstNonZero === -1 ? "" : padded.slice(firstNonZero);

  const baseStyle = {
    fontSize,
    fontWeight: "bold",
    fontFamily: "monospace",
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

// Create time display text
const makeTimeText = (seconds: number, fontSize: number) => {
  const timeStr = formatTime(seconds);
  const color = seconds <= 10 ? 0xff4444 : seconds <= 30 ? 0xffaa44 : 0x44ff44;

  const container = new PIXI.Container();
  const text = new PIXI.Text(timeStr, {
    fontSize,
    fontWeight: "bold",
    fontFamily: "monospace",
    fill: color,
  });
  text.anchor.set(0, 0.5);
  container.addChild(text);
  return container;
};

export const initScoreDisplay = () => {
  // Clean up old displays
  if (scoreText) { app.stage.removeChild(scoreText); scoreText.destroy(); }
  if (highScoreText) { app.stage.removeChild(highScoreText); highScoreText.destroy(); }
  if (comboText) { app.stage.removeChild(comboText); comboText.destroy(); }
  if (timerText) { app.stage.removeChild(timerText); timerText.destroy(); }

  const mode = getCurrentGameMode();
  const settings = getCurrentSettings();

  // Load high score for current mode
  _highScore = loadHighScore(mode, settings);

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

  comboText = makePaddedText(_combo, 4, 0xffffff, 42);
  comboText.x = SCORE_X;
  comboText.y = 900;
  comboText.pivot.x = comboText.width / 2;
  app.stage.addChild(comboText);

  // Show timer for time attack mode
  if (mode === "timeAttack") {
    _timeRemaining = settings.timeAttackDuration;
    timerText = makeTimeText(_timeRemaining, 48);
    timerText.x = SCORE_X;
    timerText.y = 580;
    timerText.pivot.x = timerText.width / 2;
    app.stage.addChild(timerText);
  }
};

export const updateScoreDisplay = () => {
  if (scoreText) {
    const newScore = makePaddedText(_score, 8, 0xff6b8a, 44);
    newScore.x = scoreText.x;
    newScore.y = scoreText.y;
    newScore.pivot.x = newScore.width / 2;
    app.stage.addChild(newScore);
    app.stage.removeChild(scoreText);
    scoreText.destroy();
    scoreText = newScore;
  }
  if (highScoreText) {
    const newHigh = makePaddedText(_highScore, 8, 0xffffff, 36);
    newHigh.x = highScoreText.x;
    newHigh.y = highScoreText.y;
    newHigh.pivot.x = newHigh.width / 2;
    app.stage.addChild(newHigh);
    app.stage.removeChild(highScoreText);
    highScoreText.destroy();
    highScoreText = newHigh;
  }
  if (comboText) {
    const newCombo = makePaddedText(_combo, 4, 0xffffff, 42);
    newCombo.x = comboText.x;
    newCombo.y = comboText.y;
    newCombo.pivot.x = newCombo.width / 2;
    app.stage.addChild(newCombo);
    app.stage.removeChild(comboText);
    comboText.destroy();
    comboText = newCombo;
  }
};

// Update timer display (for time attack mode)
export const updateTimerDisplay = () => {
  if (timerText) {
    const newTimer = makeTimeText(_timeRemaining, 48);
    newTimer.x = timerText.x;
    newTimer.y = timerText.y;
    newTimer.pivot.x = newTimer.width / 2;
    app.stage.addChild(newTimer);
    app.stage.removeChild(timerText);
    timerText.destroy();
    timerText = newTimer;
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

// Drop score: faster drops = more points
export const addDropScore = (points: number, _mult: number) => {
  _score += points;
  updateScoreDisplay();
};

// Clear score: pieces cleared + combo bonus
export const addScore = (piecesCleared: number) => {
  _combo++;
  if (_combo > _maxCombo) _maxCombo = _combo;
  const baseScore = piecesCleared * 10;
  const comboBonus = _combo > 1 ? _combo * 5 : 0;
  _score += baseScore + comboBonus;

  // Update high score
  const mode = getCurrentGameMode();
  const settings = getCurrentSettings();
  const isNewHigh = saveHighScore(mode, _score, settings);
  if (isNewHigh) {
    _highScore = _score;
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
  maxCombo: _maxCombo,
  timeRemaining: _timeRemaining,
});
