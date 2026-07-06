import * as PIXI from "pixi.js-legacy";
import { app } from ".";

let _score = 0;
let _highScore = parseInt(localStorage.getItem("highScore") || "0", 10);
let _combo = 0;
let _maxCombo = 0;

export const getScore = () => _score;
export const getHighScore = () => _highScore;
export const getCombo = () => _combo;

let scoreText: PIXI.Container;
let highScoreText: PIXI.Container;
let comboText: PIXI.Container;

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

export const initScoreDisplay = () => {
  // Clean up old displays
  if (scoreText) { app.stage.removeChild(scoreText); scoreText.destroy(); }
  if (highScoreText) { app.stage.removeChild(highScoreText); highScoreText.destroy(); }
  if (comboText) { app.stage.removeChild(comboText); comboText.destroy(); }

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

  if (_score > _highScore) {
    _highScore = _score;
    localStorage.setItem("highScore", _highScore.toString());
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
  updateScoreDisplay();
};
