/**
 * Settings schema, defaults, and pure constants.
 */
import { DEFAULT_FUN_MODES, FunModeFlags } from "../fun/modes";

export type SpeedLevel = 1 | 2 | 3 | 4 | 5;
export type TimeAttackDuration = 60 | 90 | 120 | 180;
/** Item spawn chance when stack is low enough (percent 0–30) */
export type ItemDropRate = 0 | 5 | 10 | 15 | 20 | 30;
/**
 * App window / screen mode.
 * - windowed: normal resizable window; no auto-fullscreen on start
 *   (default on large / desktop viewports when unset)
 * - borderless: full screen without title bar / decorations
 * - fullscreen: exclusive fullscreen
 *   (default on small / phone-like viewports when unset — see
 *   preferredDefaultDisplayMode in ui/display-policy)
 */
export type DisplayMode = "windowed" | "borderless" | "fullscreen";
/**
 * Character spawn facing while falling.
 * - inverted (default): head-down — harder spatial read, ×1.00
 * - upright: head-up — easier, slightly lower score mult
 */
export type SpawnOrientation = "inverted" | "upright";

export const DISPLAY_MODES: readonly DisplayMode[] = [
  "windowed",
  "borderless",
  "fullscreen",
];

export const SPEED_LEVELS: readonly SpeedLevel[] = [1, 2, 3, 4, 5];
export const TIME_ATTACK_DURATIONS: readonly TimeAttackDuration[] = [
  60, 90, 120, 180,
];

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
  /** Window / screen mode; applied on start and when the setting changes. */
  displayMode: DisplayMode;
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
 * Tuned from live play: 0% is a real clean-board advantage; 30% is heavy clutter.
 */
export const ITEM_DROP_SCORE_FACTORS: Record<ItemDropRate, number> = {
  0: 0.85,
  5: 0.92,
  10: 1.0,
  15: 1.08,
  20: 1.16,
  30: 1.28,
};

export const SPAWN_ORIENTATIONS: SpawnOrientation[] = ["inverted", "upright"];

/**
 * Score factor for spawn facing.
 * Upright is much easier to read spatially → lower mult.
 * Inverted (classic head-down) = ×1.00. Live play: -10% under-priced the ease.
 */
export const SPAWN_ORIENTATION_SCORE_FACTORS: Record<SpawnOrientation, number> =
  {
    inverted: 1.0,
    upright: 0.85,
  };

export const isSpawnOrientation = (v: unknown): v is SpawnOrientation =>
  v === "inverted" || v === "upright";

export const isDisplayMode = (v: unknown): v is DisplayMode =>
  typeof v === "string" && (DISPLAY_MODES as readonly string[]).includes(v);

export const isItemDropRate = (v: unknown): v is ItemDropRate =>
  typeof v === "number" && (ITEM_DROP_RATES as number[]).includes(v);

export const isSpeedLevel = (v: unknown): v is SpeedLevel =>
  typeof v === "number" &&
  Number.isInteger(v) &&
  (SPEED_LEVELS as readonly number[]).includes(v);

export const isTimeAttackDuration = (v: unknown): v is TimeAttackDuration =>
  typeof v === "number" &&
  Number.isInteger(v) &&
  (TIME_ATTACK_DURATIONS as readonly number[]).includes(v);

/**
 * Persist envelope version. Bump when the on-disk shape or field semantics
 * change; add a migrate step in store.loadSettings.
 * v0 = legacy flat JSON without `version` (pre-versioning).
 * v1 = flat `{ version: 1, ...GameSettings }`.
 */
export const SETTINGS_VERSION = 1 as const;

/** Absolute bases at 100% SFX slider. */
export const SFX_MOVE_BASE = 0.12;
export const SFX_LAND_BASE = 0.65;
export const SFX_EFFECT_BASE = 0.65;

/** Compact labels for tight UI (settings chips). Settlement uses full GroupName. */
export const GROUP_LABELS: Record<GroupName, string> = {
  "Leo/need": "L/n",
  "MORE MORE JUMP!": "MMJ",
  "Vivid BAD SQUAD": "VBS",
  "Wonderlands×Showtime": "WxS",
  "25時、ナイトコードで。": "25時",
};

/**
 * Official Project SEKAI unit brand colors.
 * Leo/need #4455dd · MORE MORE JUMP! #88dd44 · Vivid BAD SQUAD #ee1166 ·
 * Wonderlands×Showtime #ff9900 · 25時、ナイトコードで。 #884499
 */
export const GROUP_COLORS: Record<GroupName, string> = {
  "Leo/need": "#4455dd",
  "MORE MORE JUMP!": "#88dd44",
  "Vivid BAD SQUAD": "#ee1166",
  "Wonderlands×Showtime": "#ff9900",
  "25時、ナイトコードで。": "#884499",
};

export const getGroupColor = (group: GroupName | string): string =>
  GROUP_COLORS[group as GroupName] ?? "#ffffff";

/** Mix brand hex toward white for readable text on dark UI. */
const lightenHex = (hex: string, amount: number): string => {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;
  const n = parseInt(raw, 16);
  if (Number.isNaN(n)) return hex;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

/**
 * Brand color lightened for body text on dark settlement / share cards.
 * Keeps unit identity without losing contrast (esp. Leo/need, 25時).
 */
export const getGroupDisplayColor = (group: GroupName | string): string => {
  const base = getGroupColor(group);
  // Darker brand hues (blue / purple) need more lift than already-bright ones.
  const amount =
    group === "Leo/need" || group === "25時、ナイトコードで。" ? 0.42 : 0.28;
  return lightenHex(base, amount);
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
  /**
   * Static fallback only (desktop / tests). Live first-run default is
   * resolveDefaultDisplayMode() in load/normalize when the field is absent.
   */
  displayMode: "windowed",
};

/**
 * Play modes from the main menu.
 * - endless: free play until top-out
 * - timeAttack: countdown from settings.timeAttackDuration
 * - daily: shared UTC-day seed + frozen gameplay rules (same challenge for all)
 */
export type GameMode = "endless" | "timeAttack" | "daily";

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
