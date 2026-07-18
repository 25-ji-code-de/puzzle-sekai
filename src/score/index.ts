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
  computeScoreRank,
  getScoreRankColor,
  getScoreRankCssColor,
  scoreRankColorStyle,
  getScoreRankGlow,
  SCORE_RANKS,
  SCORE_RANK_COLORS,
  SCORE_RANK_SSS_PLUS_GRADIENT,
} from "./rank";
export type { ScoreRank, ComputeScoreRankInput } from "./rank";

export {
  initScoreDisplay,
  updateScoreDisplay,
  updateTimerDisplay,
} from "./hud";
