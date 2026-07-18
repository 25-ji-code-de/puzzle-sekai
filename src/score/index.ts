/**
 * Score public API — model + HUD + summary presentation helpers.
 */
export {
  getScore,
  getHighScore,
  getCombo,
  getTimeRemaining,
  setTimeRemaining,
  decrementTime,
  addDropScore,
  addScore,
  resetCombo,
  resetScore,
  recordGroupClear,
  flushHighScoreIfNeeded,
  bindHighScoreLifecycle,
  getScoreSummary,
} from "./model";

export type { ScoreSummary } from "./model";

export {
  padDigits,
  splitPaddedNumber,
  groupsForSummary,
  formatMultiplier,
  SCORE_PAD,
  COMBO_PAD,
  GROUP_CLEAR_PAD,
} from "./summary-format";

export {
  initScoreDisplay,
  updateScoreDisplay,
  updateTimerDisplay,
} from "./hud";
