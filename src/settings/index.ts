/**
 * Settings public API — re-exports split modules.
 */
export type {
  SpeedLevel,
  TimeAttackDuration,
  ItemDropRate,
  SpawnOrientation,
  GroupName,
  GameSettings,
  GameMode,
  HighScoreRecord,
  DifficultyLevel,
} from "./types";

export {
  GAME_GROUPS,
  SPEED_MULTIPLIERS,
  ITEM_DROP_RATES,
  ITEM_DROP_SCORE_FACTORS,
  SPAWN_ORIENTATIONS,
  SPAWN_ORIENTATION_SCORE_FACTORS,
  isSpawnOrientation,
  SFX_MOVE_BASE,
  SFX_LAND_BASE,
  SFX_EFFECT_BASE,
  GROUP_LABELS,
} from "./types";

export {
  clampVolumePercent,
  getVolumeScale,
  scaleVolume,
  bgmVol,
  sfxVol,
  voiceVol,
} from "./volume";

export {
  loadSettings,
  saveSettings,
  getCurrentSettings,
  updateCurrentSettings,
  getCurrentGameMode,
  setCurrentGameMode,
} from "./store";

export {
  getSpeedMultiplier,
  getDifficultyLevel,
  getDifficultyLabel,
  DIFFICULTY_COLORS,
  APPEND_GRADIENT,
  getDifficultyColor,
  getDifficultyCssColor,
  hexToPixi,
  getBaseScoreMultiplier,
  isEntertainmentMode,
  getFinalScoreMultiplier,
  getScoreMultiplierBreakdown,
  getItemDropChance,
  getScoreMultiplier,
  getSpawnRotation,
  getSpeedLabel,
  getTimeLabel,
  getItemDropLabel,
} from "./difficulty";
export type { ScoreMultLine, ScoreMultBreakdown } from "./difficulty";

export {
  getHighScoreKey,
  loadHighScoreRecord,
  loadHighScore,
  saveHighScore,
} from "./high-score";

export { clearAppData, clearAppCaches } from "./data";

export { getStoragePort, setStoragePort, type StoragePort } from "./storage";
