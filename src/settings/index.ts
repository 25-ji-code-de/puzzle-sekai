/**
 * Settings public API — re-exports split modules.
 */
export type {
  SpeedLevel,
  TimeAttackDuration,
  ItemDropRate,
  SpawnOrientation,
  DisplayMode,
  GroupName,
  GameSettings,
  GameMode,
  HighScoreRecord,
  DifficultyLevel,
} from "./types";

export {
  GAME_GROUPS,
  SPEED_LEVELS,
  TIME_ATTACK_DURATIONS,
  SPEED_MULTIPLIERS,
  ITEM_DROP_RATES,
  ITEM_DROP_SCORE_FACTORS,
  SPAWN_ORIENTATIONS,
  SPAWN_ORIENTATION_SCORE_FACTORS,
  DISPLAY_MODES,
  isSpawnOrientation,
  isDisplayMode,
  isItemDropRate,
  isSpeedLevel,
  isTimeAttackDuration,
  SETTINGS_VERSION,
  SFX_MOVE_BASE,
  SFX_LAND_BASE,
  SFX_EFFECT_BASE,
  GROUP_LABELS,
  GROUP_COLORS,
  getGroupColor,
  getGroupDisplayColor,
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
  getUserSettings,
  beginMatchSettingsOverride,
  clearMatchSettingsOverride,
  hasMatchSettingsOverride,
  updateCurrentSettings,
  normalizeSettings,
  migrateSettingsPayload,
  getCurrentGameMode,
  setCurrentGameMode,
  getActiveDailyDateKey,
  clearActiveDailyDateKey,
  setActiveDailyDateKey,
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
  BASE_SCORE_MULTIPLIERS,
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
  emptyRecord,
  loadHighScoreRecord,
  loadBestHighScoreRecord,
  listHighScoreRecords,
  loadHighScore,
  saveHighScore,
} from "./high-score";

export { clearAppData, clearAppCaches } from "./data";

export { getStoragePort, setStoragePort, type StoragePort } from "./storage";

export {
  REPLAY_LIMIT,
  REPLAY_STORAGE_KEY,
  REPLAY_VERSION,
  appendReplayEntry,
  activateReplayPlayback,
  beginReplayRecording,
  clearReplayEntries,
  clearReplayPlayback,
  clearReplayRecording,
  consumeQueuedReplayPlayback,
  finishReplayRecording,
  flushReplayPlayback,
  getReplayLiveControlTarget,
  getReplayPlaybackEntry,
  hasQueuedReplayPlayback,
  isCurrentRunReplayRecordable,
  isReplayPlayback,
  isReplayRecording,
  listReplaySummaries,
  loadReplayEntries,
  loadReplayEntry,
  pauseReplayPlaybackClock,
  pauseReplayRecordingClock,
  queueReplayPlayback,
  recordReplayAction,
  replayModeLabel,
  resumeReplayPlaybackClock,
  resumeReplayRecordingClock,
  setReplayLiveControlTarget,
  type ReplayControlTarget,
  type ReplayAction,
  type ReplayEntry,
  type ReplayInput,
  type ReplaySettingsSnapshot,
  type ReplaySummary,
  type ReplayableSettings,
} from "../replay";
