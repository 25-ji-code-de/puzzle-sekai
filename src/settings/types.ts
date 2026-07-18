/**
 * Settings schema, defaults, and pure constants.
 */
import { DEFAULT_FUN_MODES, FunModeFlags } from "../fun/modes";

export type SpeedLevel = 1 | 2 | 3 | 4 | 5;
export type TimeAttackDuration = 60 | 90 | 120 | 180;
/** Item spawn chance when stack is low enough (percent 0–30) */
export type ItemDropRate = 0 | 5 | 10 | 15 | 20 | 30;
/**
 * Character spawn facing while falling.
 * - inverted (default): head-down — harder spatial read, ×1.00
 * - upright: head-up — easier, slightly lower score mult
 */
export type SpawnOrientation = "inverted" | "upright";

export const GAME_GROUPS = [
  "Leo/need",
  "MORE MORE JUMP!",
  "Vivid BAD SQUAD",
  "Wonderlands×Showtime",
  "25時、ナイトコードで。",
] as const;

export type GroupName = (typeof GAME_GROUPS)[number];

export interface GameSettings {
  speedLevel: SpeedLevel;
  timeAttackDuration: TimeAttackDuration;
  selectedGroups: GroupName[]; // 3-5 groups
  funModes: FunModeFlags;
  /** Percent chance to spawn items when max stack height < 5 */
  itemDropRate: ItemDropRate;
  /** Head-down (default) vs head-up spawn while falling */
  spawnOrientation: SpawnOrientation;
  /** BGM loudness 0–100 (100 keeps legacy base volumes) */
  bgmVolume: number;
  /** Move / land / effect SFX loudness 0–100 */
  sfxVolume: number;
  /** Character / unit voice loudness 0–100 */
  voiceVolume: number;
  /**
   * Low-performance mode: render the 1920×1080 stage into a half-resolution
   * canvas buffer (~960×540). Stage coordinates stay the same; pixels cost less.
   */
  lowPerformance: boolean;
}

export const SPEED_MULTIPLIERS: Record<SpeedLevel, number> = {
  1: 0.6,
  2: 1.0,
  3: 1.5,
  4: 2.0,
  5: 3.0,
};

export const ITEM_DROP_RATES: ItemDropRate[] = [0, 5, 10, 15, 20, 30];

/**
 * Score factor for item drop rate.
 * More items clutter the board → harder → higher mult.
 * Baseline 10% (legacy default) = ×1.00
 */
export const ITEM_DROP_SCORE_FACTORS: Record<ItemDropRate, number> = {
  0: 0.88,
  5: 0.94,
  10: 1.0,
  15: 1.06,
  20: 1.12,
  30: 1.22,
};

export const SPAWN_ORIENTATIONS: SpawnOrientation[] = ["inverted", "upright"];

/**
 * Score factor for spawn facing.
 * Upright is easier to read → lower mult. Inverted (classic) = ×1.00.
 */
export const SPAWN_ORIENTATION_SCORE_FACTORS: Record<SpawnOrientation, number> =
  {
    inverted: 1.0,
    upright: 0.9,
  };

export const isSpawnOrientation = (v: unknown): v is SpawnOrientation =>
  v === "inverted" || v === "upright";

export const isItemDropRate = (v: unknown): v is ItemDropRate =>
  typeof v === "number" && (ITEM_DROP_RATES as number[]).includes(v);

/** Absolute bases at 100% SFX slider. */
export const SFX_MOVE_BASE = 0.12;
export const SFX_LAND_BASE = 0.65;
export const SFX_EFFECT_BASE = 0.65;

export const GROUP_LABELS: Record<GroupName, string> = {
  "Leo/need": "Leo/need",
  "MORE MORE JUMP!": "MMJ",
  "Vivid BAD SQUAD": "VBS",
  "Wonderlands×Showtime": "WxS",
  "25時、ナイトコードで。": "25時、ナイトコードで。",
};

export const DEFAULT_SETTINGS: GameSettings = {
  speedLevel: 2,
  timeAttackDuration: 90,
  selectedGroups: [...GAME_GROUPS],
  funModes: { ...DEFAULT_FUN_MODES },
  itemDropRate: 10,
  spawnOrientation: "inverted",
  bgmVolume: 100,
  sfxVolume: 100,
  voiceVolume: 100,
  lowPerformance: false,
};

export type GameMode = "endless" | "timeAttack";

export type HighScoreRecord = {
  score: number;
  /** Difficulty when the high score was achieved; 0 = empty / unknown */
  difficultyLevel: number;
  /** Whether entertainment modes were on when the score was set */
  entertainment: boolean;
  /** Epoch ms when this record was written; 0 for empty */
  updatedAt: number;
};

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const SETTINGS_KEY = "puzzleSekaiSettings";
