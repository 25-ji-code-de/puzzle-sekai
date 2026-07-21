/**
 * In-game score / combo / timer PIXI HUD.
 * Also drives screen-reader live regions (score / low timer).
 */
import * as PIXI from "pixi.js-legacy";
import { announceTimerIfNeeded, scheduleScoreAnnounce } from "../a11y";
import { app } from "../runtime";
import {
  DifficultyLevel,
  getCurrentGameMode,
  getCurrentSettings,
  getDifficultyLabel,
  getDifficultyColor,
  getScoreMultiplier,
  isEntertainmentMode,
} from "../settings";
import { t, onLocaleChange } from "../i18n";
import { resolveFontScheme } from "../ui/fonts";
import {
  bindScoreHud,
  getScore,
  getHighScore,
  getHighScoreDifficulty,
  getHighScoreEntertainment,
  getCombo,
  getTimeRemaining,
  loadMatchHighScore,
  seedTimeRemaining,
} from "./model";
import { padStartDigits } from "../util/pad";
import { formatTimesMult } from "../util/format";
import { hexToPixi } from "../util/color";

let scoreText: PIXI.Container | undefined;
let highScoreText: PIXI.Container | undefined;
let comboText: PIXI.Container | undefined;
let timerText: PIXI.Container | undefined;
let multBadge: PIXI.Container | undefined;

const SCORE_X = 1700;
const SCORE_FONT_SIZE = 48;
const HIGH_SCORE_FONT_SIZE = 32;
const COMBO_FONT_SIZE = 44;
const TIMER_FONT_SIZE = 48;
const pad = (n: number, len: number) => padStartDigits(n, len);

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

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${pad(secs, 2)}`;
};

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

const formatCurrentMultiplier = (mult: number) => {
  const parts = [formatTimesMult(mult)];
  if (isEntertainmentMode(getCurrentSettings())) {
    parts.push(t("hsTags.entCompact"));
  }
  return parts.join("  ");
};

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

const getBadgeColor = (hsDiff: number): number => {
  if (hsDiff >= 1 && hsDiff <= 7) {
    return hexToPixi(getDifficultyColor(hsDiff));
  }
  return 0xaaccff;
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

export const updateScoreDisplay = () => {
  if (scoreText) {
    const newScore = makePaddedText(getScore(), 8, 0xff6b8a, SCORE_FONT_SIZE);
    newScore.pivot.x = newScore.width / 2;
    scoreText = replaceDisplay(scoreText, newScore);
  }
  if (highScoreText) {
    const newHigh = makePaddedText(
      getHighScore(),
      8,
      0xffffff,
      HIGH_SCORE_FONT_SIZE,
    );
    newHigh.pivot.x = newHigh.width / 2;
    highScoreText = replaceDisplay(highScoreText, newHigh);
  }
  if (comboText) {
    const newCombo = makePaddedText(getCombo(), 4, 0xffffff, COMBO_FONT_SIZE);
    newCombo.pivot.x = newCombo.width / 2;
    comboText = replaceDisplay(comboText, newCombo);
  }
  if (multBadge) {
    const settings = getCurrentSettings();
    const next = makeMultiplierBadge(
      getScoreMultiplier(settings),
      getHighScoreDifficulty(),
      getHighScoreEntertainment(),
    );
    multBadge = replaceDisplay(multBadge, next);
  }
};

export const updateTimerDisplay = () => {
  if (timerText) {
    const newTimer = makeTimeText(getTimeRemaining(), TIMER_FONT_SIZE);
    newTimer.pivot.x = newTimer.width / 2;
    timerText = replaceDisplay(timerText, newTimer);
  }
};

bindScoreHud({
  onScoreChanged: () => {
    updateScoreDisplay();
    scheduleScoreAnnounce();
  },
  onTimerChanged: () => {
    updateTimerDisplay();
    announceTimerIfNeeded();
  },
});

onLocaleChange(() => {
  if (!multBadge) return;
  const settings = getCurrentSettings();
  const next = makeMultiplierBadge(
    getScoreMultiplier(settings),
    getHighScoreDifficulty(),
    getHighScoreEntertainment(),
  );
  multBadge = replaceDisplay(multBadge, next);
});

/** Remove in-match HUD from the stage (menu / teardown). Safe if never inited. */
export const disposeScoreDisplay = () => {
  const drop = (node: PIXI.Container | undefined) => {
    if (!node) return;
    if (node.parent) node.parent.removeChild(node);
    node.destroy({ children: true });
  };
  drop(scoreText);
  drop(highScoreText);
  drop(comboText);
  drop(timerText);
  drop(multBadge);
  scoreText = undefined;
  highScoreText = undefined;
  comboText = undefined;
  timerText = undefined;
  multBadge = undefined;
};

export const initScoreDisplay = () => {
  disposeScoreDisplay();

  const mode = getCurrentGameMode();
  const settings = getCurrentSettings();
  const mult = getScoreMultiplier(settings);

  loadMatchHighScore();

  scoreText = makePaddedText(getScore(), 8, 0xff6b8a, SCORE_FONT_SIZE);
  scoreText.x = SCORE_X;
  scoreText.y = 655;
  scoreText.pivot.x = scoreText.width / 2;
  app.stage.addChild(scoreText);

  highScoreText = makePaddedText(
    getHighScore(),
    8,
    0xffffff,
    HIGH_SCORE_FONT_SIZE,
  );
  highScoreText.x = SCORE_X;
  highScoreText.y = 745;
  highScoreText.pivot.x = highScoreText.width / 2;
  app.stage.addChild(highScoreText);

  multBadge = makeMultiplierBadge(
    mult,
    getHighScoreDifficulty(),
    getHighScoreEntertainment(),
  );
  multBadge.x = SCORE_X;
  multBadge.y = 798;
  app.stage.addChild(multBadge);

  comboText = makePaddedText(getCombo(), 4, 0xffffff, COMBO_FONT_SIZE);
  comboText.x = SCORE_X;
  comboText.y = 900;
  comboText.pivot.x = comboText.width / 2;
  app.stage.addChild(comboText);

  if (mode === "timeAttack") {
    seedTimeRemaining(settings.timeAttackDuration);
    timerText = makeTimeText(getTimeRemaining(), TIMER_FONT_SIZE);
    timerText.x = SCORE_X + 50;
    timerText.y = 130;
    timerText.pivot.x = timerText.width / 2;
    app.stage.addChild(timerText);
  }
};
