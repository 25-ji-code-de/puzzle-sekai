/**
 * Score public API — model + HUD + summary presentation helpers.
 */
export {
  getScore,
  getHighScore,
  getCombo,
  getTimeRemaining,
  getPlayedSeconds,
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
  finalizeRunForDan,
  chainMultiplierOf,
  DROP_SCORE_FACTOR,
  CHAIN_MULT_CAP,
} from "./model";

export type { ScoreSummary } from "./model";

export {
  effectiveScore,
  PERFORMANCE_BASELINE_SECONDS,
  ENDLESS_DURATION_MIN,
  ENDLESS_DURATION_MAX,
} from "./performance";
export type { EffectiveScoreInput } from "./performance";

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
  DAN_IDS,
  DAN_STORAGE_KEY,
  danColorStyle,
  danFromTotal,
  danOrnament,
  getDanColor,
  getDanCssColor,
  getDanGlow,
  computeDanRating,
  compareDan,
} from "./dan";
export type { DanId, DanRunEntry, DanState, DanRatingBreakdown } from "./dan";

export {
  getDanSummary,
  recordDanRun,
  resetDanSessionLatch,
  getLastDanRecordResult,
  danMessageKey,
} from "./dan-store";
export type {
  DanSummary,
  RecordDanRunInput,
  RecordDanRunResult,
} from "./dan-store";

export {
  initScoreDisplay,
  disposeScoreDisplay,
  updateScoreDisplay,
  updateTimerDisplay,
} from "./hud";
