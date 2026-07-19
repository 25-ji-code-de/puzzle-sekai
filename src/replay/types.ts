/**
 * Replay data model — best-effort spectator playback for non-truePhysics runs.
 */
import type {
  DifficultyLevel,
  GameMode,
  GameSettings,
  GroupName,
  ItemDropRate,
  SpawnOrientation,
  SpeedLevel,
  TimeAttackDuration,
} from "../settings";
import type { FunModeFlags } from "../fun/modes";

export const REPLAY_STORAGE_KEY = "puzzleSekaiReplays";
export const REPLAY_VERSION = 1 as const;
export const REPLAY_LIMIT = 20;

export type ReplayAction = "L" | "R" | "CW" | "CCW" | "HD" | "SD" | "ND" | "LF";

export type ReplayInput = {
  /** Match-elapsed ms (pauses excluded). */
  t: number;
  /** Semantic action after any control remap resolution. */
  a: ReplayAction;
};

export type ReplaySettingsSnapshot = {
  speedLevel: SpeedLevel;
  timeAttackDuration: TimeAttackDuration;
  selectedGroups: GroupName[];
  funModes: FunModeFlags;
  itemDropRate: ItemDropRate;
  spawnOrientation: SpawnOrientation;
};

export type ReplayEntry = {
  v: typeof REPLAY_VERSION;
  id: string;
  savedAt: number;
  seed: number;
  mode: GameMode;
  dailyDateKey?: string;
  settings: ReplaySettingsSnapshot;
  score: number;
  maxCombo: number;
  difficulty: DifficultyLevel;
  entertainment: boolean;
  multiplier: number;
  scoreRank: string;
  playedSeconds: number;
  durationMs: number;
  inputs: ReplayInput[];
};

export type ReplaySummary = Pick<
  ReplayEntry,
  | "id"
  | "savedAt"
  | "mode"
  | "dailyDateKey"
  | "score"
  | "maxCombo"
  | "difficulty"
  | "entertainment"
  | "scoreRank"
  | "playedSeconds"
  | "durationMs"
>;

export type ReplayableSettings = Pick<
  GameSettings,
  | "speedLevel"
  | "timeAttackDuration"
  | "selectedGroups"
  | "funModes"
  | "itemDropRate"
  | "spawnOrientation"
>;
