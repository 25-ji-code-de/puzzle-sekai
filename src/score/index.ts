/**
 * Score public API — model + HUD.
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
  flushHighScoreIfNeeded,
  bindHighScoreLifecycle,
  getScoreSummary,
} from "./model";

export {
  initScoreDisplay,
  updateScoreDisplay,
  updateTimerDisplay,
} from "./hud";
