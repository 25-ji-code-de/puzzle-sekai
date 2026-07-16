// Game settings management

import {
  DEFAULT_FUN_MODES,
  FUN_MODE_DEFS,
  FunModeFlags,
  getFunModeMultiplier,
  isEntertainmentMode as funFlagsOn,
  normalizeFunModes,
  scaleItemLinkedFactor,
} from "./fun-modes";
import { t } from "./i18n";

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

// Available groups
export const GAME_GROUPS = [
  "Leo/need",
  "MORE MORE JUMP!",
  "Vivid BAD SQUAD",
  "Wonderlands×Showtime",
  "25時、ナイトコードで。",
] as const;

export type GroupName = typeof GAME_GROUPS[number];

export interface GameSettings {
  speedLevel: SpeedLevel;
  timeAttackDuration: TimeAttackDuration;
  selectedGroups: GroupName[];  // 3-5 groups
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
}

// Speed multipliers for each level
export const SPEED_MULTIPLIERS: Record<SpeedLevel, number> = {
  1: 0.6,   // 慢速 (Slow)
  2: 1.0,   // 普通 (Normal)
  3: 1.5,   // 快速 (Fast)
  4: 2.0,   // 极速 (Very Fast)
  5: 3.0,   // 地狱 (Hell)
};

// Speed level labels (i18n-aware)
export const getSpeedLabel = (level: SpeedLevel): string =>
  t(`settings.speed.${(["slow", "normal", "fast", "faster", "hell"] as const)[level - 1]}`);

// Time attack duration labels (i18n-aware)
export const getTimeLabel = (duration: TimeAttackDuration): string =>
  t("settings.ta.duration", { seconds: duration });

export const ITEM_DROP_RATES: ItemDropRate[] = [0, 5, 10, 15, 20, 30];

// Item drop rate labels (i18n-aware)
export const getItemDropLabel = (rate: ItemDropRate): string =>
  rate === 0 ? t("settings.item.none") : `${rate}%`;

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
export const SPAWN_ORIENTATION_SCORE_FACTORS: Record<
  SpawnOrientation,
  number
> = {
  inverted: 1.0,
  upright: 0.9,
};

export const isSpawnOrientation = (v: unknown): v is SpawnOrientation =>
  v === "inverted" || v === "upright";

/** Initial sprite.rotation for character pieces under current setting. */
export function getSpawnRotation(settings?: GameSettings): number {
  const s = settings ?? getCurrentSettings();
  return s.spawnOrientation === "upright" ? 0 : Math.PI;
}

/** Clamp / coerce a stored volume percent (0–100). Invalid → default. */
export function clampVolumePercent(
  v: unknown,
  fallback: number = 100,
): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.min(100, Math.max(0, Math.round(v)));
}

/**
 * User channel gain 0–1 (100% → 1). Use as Sound.volume so it multiplies
 * the per-play base volume (pixi-sound: instance × sound × context).
 */
export function getVolumeScale(
  channel: "bgm" | "sfx" | "voice",
  settings?: GameSettings,
): number {
  const s = settings ?? getCurrentSettings();
  const pct =
    channel === "bgm"
      ? clampVolumePercent(s.bgmVolume)
      : channel === "sfx"
        ? clampVolumePercent(s.sfxVolume)
        : clampVolumePercent(s.voiceVolume);
  return pct / 100;
}

/**
 * Absolute play volume = legacy base × user channel %.
 * Prefer this for one-shot SFX/voice via play({ volume }).
 * For long-lived BGM, set Sound.volume = getVolumeScale("bgm") and play with
 * the raw base so the slider can retune without double-applying.
 */
export function scaleVolume(
  channel: "bgm" | "sfx" | "voice",
  base: number,
  settings?: GameSettings,
): number {
  return base * getVolumeScale(channel, settings);
}

export const bgmVol = (base = 0.3, settings?: GameSettings) =>
  scaleVolume("bgm", base, settings);
export const sfxVol = (base: number, settings?: GameSettings) =>
  scaleVolume("sfx", base, settings);
export const voiceVol = (base: number, settings?: GameSettings) =>
  scaleVolume("voice", base, settings);

/** Absolute bases at 100% SFX slider (slightly hotter than the old hardcoded values). */
export const SFX_MOVE_BASE = 0.12; // was 0.05
export const SFX_LAND_BASE = 0.65; // was 0.5
export const SFX_EFFECT_BASE = 0.65; // fun-mode effect one-shots

// Group display names (Japanese)
export const GROUP_LABELS: Record<GroupName, string> = {
  "Leo/need": "Leo/need",
  "MORE MORE JUMP!": "MMJ",
  "Vivid BAD SQUAD": "VBS",
  "Wonderlands×Showtime": "WxS",
  "25時、ナイトコードで。": "25時、ナイトコードで。",
};

// Default settings (all 5 groups selected, fun modes off, 10% items, inverted)
const DEFAULT_SETTINGS: GameSettings = {
  speedLevel: 2,
  timeAttackDuration: 90,
  selectedGroups: [...GAME_GROUPS],
  funModes: { ...DEFAULT_FUN_MODES },
  itemDropRate: 10,
  spawnOrientation: "inverted",
  bgmVolume: 100,
  sfxVolume: 100,
  voiceVolume: 100,
};

const isItemDropRate = (v: unknown): v is ItemDropRate =>
  typeof v === "number" && (ITEM_DROP_RATES as number[]).includes(v);

// localStorage key
const SETTINGS_KEY = "puzzleSekaiSettings";

// Load settings from localStorage
export function loadSettings(): GameSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);

      // Validate selectedGroups (must be 3-5 valid groups)
      let selectedGroups = parsed.selectedGroups;
      if (!Array.isArray(selectedGroups) || selectedGroups.length < 3 || selectedGroups.length > 5) {
        selectedGroups = [...GAME_GROUPS];
      } else {
        selectedGroups = selectedGroups.filter((g: string) => GAME_GROUPS.includes(g as GroupName));
        if (selectedGroups.length < 3) {
          selectedGroups = [...GAME_GROUPS];
        }
      }

      return {
        speedLevel: parsed.speedLevel || DEFAULT_SETTINGS.speedLevel,
        timeAttackDuration: parsed.timeAttackDuration || DEFAULT_SETTINGS.timeAttackDuration,
        selectedGroups: selectedGroups as GroupName[],
        funModes: normalizeFunModes(parsed.funModes),
        itemDropRate: isItemDropRate(parsed.itemDropRate)
          ? parsed.itemDropRate
          : DEFAULT_SETTINGS.itemDropRate,
        spawnOrientation: isSpawnOrientation(parsed.spawnOrientation)
          ? parsed.spawnOrientation
          : DEFAULT_SETTINGS.spawnOrientation,
        bgmVolume: clampVolumePercent(
          parsed.bgmVolume,
          DEFAULT_SETTINGS.bgmVolume,
        ),
        sfxVolume: clampVolumePercent(
          parsed.sfxVolume,
          DEFAULT_SETTINGS.sfxVolume,
        ),
        voiceVolume: clampVolumePercent(
          parsed.voiceVolume,
          DEFAULT_SETTINGS.voiceVolume,
        ),
      };
    }
  } catch (e) {
    console.warn("Failed to load settings:", e);
  }
  return {
    ...DEFAULT_SETTINGS,
    selectedGroups: [...GAME_GROUPS],
    funModes: { ...DEFAULT_FUN_MODES },
  };
}

// Save settings to localStorage
export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("Failed to save settings:", e);
  }
}

// Get speed multiplier for current settings
export function getSpeedMultiplier(settings: GameSettings): number {
  return SPEED_MULTIPLIERS[settings.speedLevel];
}

// ---- Difficulty rating (speed + group count; fewer groups = easier) ----

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Difficulty 1–7: speedLevel + (groupCount - 3). More groups = harder. */
export function getDifficultyLevel(settings: GameSettings): DifficultyLevel {
  const groups = Math.min(5, Math.max(3, settings.selectedGroups.length));
  const level = settings.speedLevel + (groups - 3);
  return Math.min(7, Math.max(1, level)) as DifficultyLevel;
}

/** Get difficulty label (i18n-aware) */
export function getDifficultyLabel(
  settingsOrLevel: GameSettings | DifficultyLevel,
): string {
  const level =
    typeof settingsOrLevel === "number"
      ? settingsOrLevel
      : getDifficultyLevel(settingsOrLevel);
  const i18nKey = `difficulty.${level}`;
  const translated = t(i18nKey);
  return translated !== i18nKey ? translated : `${level}`;
}

/** Difficulty colors (Project SEKAI style) */
export const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  1: "#88ee55", // Easy – soft green
  2: "#55ccee", // Normal – sky blue
  3: "#ffbb33", // Hard – warm amber
  4: "#ff5577", // Expert – coral red
  5: "#bb66ff", // Master – vivid purple
  6: "#ddbbff", // Re:Master – soft lavender
  7: "#ff88cc", // Append – pink (gradient base)
};

/** Append uses a pink → lavender gradient */
export const APPEND_GRADIENT = "linear-gradient(90deg, #ff88cc, #ddbbff)";

/** Get hex color for a difficulty level (single color) */
export function getDifficultyColor(level: number): string {
  return DIFFICULTY_COLORS[level as DifficultyLevel] ?? "#ffffff";
}

/**
 * Get CSS color string for a difficulty level.
 * Append (level 7) returns a gradient; others return a flat color.
 */
export function getDifficultyCssColor(level: number): string {
  if (level === 7) return APPEND_GRADIENT;
  return getDifficultyColor(level);
}

/** Convert "#rrggbb" → 0xrrggbb for PixiJS */
export function hexToPixi(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

/** Base score multiplier from difficulty only ~0.5 (★1) … ~3.0 (★7) */
export function getBaseScoreMultiplier(settings: GameSettings): number {
  const d = getDifficultyLevel(settings);
  return 0.5 + (d - 1) * (2.5 / 6);
}

export function isEntertainmentMode(settings: GameSettings): boolean {
  return funFlagsOn(settings.funModes ?? DEFAULT_FUN_MODES);
}

/** Final score mult = base difficulty × fun-mode product × item-drop factor */
export function getFinalScoreMultiplier(settings: GameSettings): number {
  return getScoreMultiplierBreakdown(settings).final;
}

export type ScoreMultLine = {
  label: string;
  factor: number;
};

export type ScoreMultBreakdown = {
  base: number;
  fun: number;
  item: number;
  orientation: number;
  final: number;
  difficultyLabel: string;
  itemDropRate: ItemDropRate;
  spawnOrientation: SpawnOrientation;
  lines: ScoreMultLine[];
};

/** Detailed factors for UI tooltip */
export function getScoreMultiplierBreakdown(
  settings: GameSettings,
): ScoreMultBreakdown {
  const base = getBaseScoreMultiplier(settings);
  const rate = isItemDropRate(settings.itemDropRate)
    ? settings.itemDropRate
    : DEFAULT_SETTINGS.itemDropRate;
  const orientation = isSpawnOrientation(settings.spawnOrientation)
    ? settings.spawnOrientation
    : DEFAULT_SETTINGS.spawnOrientation;
  const flags = settings.funModes ?? DEFAULT_FUN_MODES;
  const fun = getFunModeMultiplier(flags, rate);
  const item = ITEM_DROP_SCORE_FACTORS[rate];
  const orient = SPAWN_ORIENTATION_SCORE_FACTORS[orientation];
  const final = Math.min(4, Math.max(0.3, base * fun * item * orient));

  const lines: ScoreMultLine[] = [
    {
      label: t("settings.difficulty.diffLine", {
        difficulty: getDifficultyLabel(settings),
        speed: settings.speedLevel,
        groups: settings.selectedGroups.length,
      }),
      factor: base,
    },
    {
      label: t("settings.difficulty.itemLine", { rate: getItemDropLabel(rate) }),
      factor: item,
    },
    {
      label: t("settings.difficulty.orientLine", {
        orient: t(`settings.orientation.${orientation}`),
      }),
      factor: orient,
    },
  ];

  for (const def of FUN_MODE_DEFS) {
    if (!flags[def.id]) continue;
    const factor = def.itemLinked
      ? scaleItemLinkedFactor(def.scoreFactor, rate)
      : def.scoreFactor;
    const funName = t(`fun.${def.id}.name`);
    lines.push({
      label: def.itemLinked
        ? t("settings.difficulty.funLineItemLinked", { name: funName })
        : funName,
      factor,
    });
  }

  return {
    base,
    fun,
    item,
    orientation: orient,
    final,
    difficultyLabel: getDifficultyLabel(settings),
    itemDropRate: rate,
    spawnOrientation: orientation,
    lines,
  };
}

/** Chance 0–1 used when deciding to spawn items */
export function getItemDropChance(settings: GameSettings): number {
  const rate = isItemDropRate(settings.itemDropRate)
    ? settings.itemDropRate
    : DEFAULT_SETTINGS.itemDropRate;
  return rate / 100;
}

/** Alias used by score/UI — always final mult */
export function getScoreMultiplier(settings: GameSettings): number {
  return getFinalScoreMultiplier(settings);
}

// Game mode type
export type GameMode = "endless" | "timeAttack";

export type HighScoreRecord = {
  score: number;
  /** Difficulty when the high score was achieved; 0 = unknown/legacy */
  difficultyLevel: number;
  /** Whether entertainment modes were on when the score was set */
  entertainment: boolean;
};

// Get high score key for a specific mode (not split by difficulty)
export function getHighScoreKey(mode: GameMode, settings?: GameSettings): string {
  if (mode === "endless") return "highScore_endless";
  return `highScore_timeAttack_${settings?.timeAttackDuration || 90}`;
}

function getHighScoreDifficultyKey(mode: GameMode, settings?: GameSettings): string {
  return `${getHighScoreKey(mode, settings)}_difficulty`;
}

function getHighScoreEntertainmentKey(mode: GameMode, settings?: GameSettings): string {
  return `${getHighScoreKey(mode, settings)}_entertainment`;
}

// Load high score + difficulty + entertainment record
export function loadHighScoreRecord(
  mode: GameMode,
  settings?: GameSettings,
): HighScoreRecord {
  try {
    const scoreKey = getHighScoreKey(mode, settings);
    const diffKey = getHighScoreDifficultyKey(mode, settings);
    const entKey = getHighScoreEntertainmentKey(mode, settings);
    const score = parseInt(localStorage.getItem(scoreKey) || "0", 10) || 0;
    const difficultyLevel =
      parseInt(localStorage.getItem(diffKey) || "0", 10) || 0;
    const entertainment = localStorage.getItem(entKey) === "1";
    return { score, difficultyLevel, entertainment };
  } catch {
    return { score: 0, difficultyLevel: 0, entertainment: false };
  }
}

// Load high score number only (compat)
export function loadHighScore(mode: GameMode, settings?: GameSettings): number {
  return loadHighScoreRecord(mode, settings).score;
}

// Save high score if higher; store difficulty + entertainment of that run
export function saveHighScore(
  mode: GameMode,
  score: number,
  settings?: GameSettings,
): boolean {
  try {
    const current = loadHighScoreRecord(mode, settings);
    if (score > current.score) {
      const s = settings ?? getCurrentSettings();
      localStorage.setItem(getHighScoreKey(mode, settings), score.toString());
      localStorage.setItem(
        getHighScoreDifficultyKey(mode, settings),
        String(getDifficultyLevel(s)),
      );
      localStorage.setItem(
        getHighScoreEntertainmentKey(mode, settings),
        isEntertainmentMode(s) ? "1" : "0",
      );
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Current game settings (singleton)
let currentSettings: GameSettings = loadSettings();

export function getCurrentSettings(): GameSettings {
  return currentSettings;
}

export function updateCurrentSettings(settings: GameSettings): void {
  currentSettings = {
    ...settings,
    funModes: normalizeFunModes(settings.funModes),
    itemDropRate: isItemDropRate(settings.itemDropRate)
      ? settings.itemDropRate
      : DEFAULT_SETTINGS.itemDropRate,
    spawnOrientation: isSpawnOrientation(settings.spawnOrientation)
      ? settings.spawnOrientation
      : DEFAULT_SETTINGS.spawnOrientation,
    bgmVolume: clampVolumePercent(
      settings.bgmVolume,
      DEFAULT_SETTINGS.bgmVolume,
    ),
    sfxVolume: clampVolumePercent(
      settings.sfxVolume,
      DEFAULT_SETTINGS.sfxVolume,
    ),
    voiceVolume: clampVolumePercent(
      settings.voiceVolume,
      DEFAULT_SETTINGS.voiceVolume,
    ),
  };
  saveSettings(currentSettings);
}

// Current game mode
let currentGameMode: GameMode = "endless";

export function getCurrentGameMode(): GameMode {
  return currentGameMode;
}

export function setCurrentGameMode(mode: GameMode): void {
  currentGameMode = mode;
}

/** localStorage keys owned by this app (settings, locale, high scores). */
const isAppStorageKey = (key: string): boolean =>
  key === SETTINGS_KEY ||
  key === "puzzleSekaiLocale" ||
  key === "highScore_endless" ||
  key.startsWith("highScore_endless_") ||
  key.startsWith("highScore_timeAttack_");

/**
 * Wipe app local data: settings, locale, and all high-score records.
 * Resets the in-memory settings singleton to defaults.
 */
export function clearAppData(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isAppStorageKey(key)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    console.warn("Failed to clear app data:", e);
  }
  currentSettings = {
    ...DEFAULT_SETTINGS,
    selectedGroups: [...GAME_GROUPS],
    funModes: { ...DEFAULT_FUN_MODES },
  };
}

/**
 * Delete Cache Storage entries (PWA / workbox audio & font caches, etc.).
 * Does not touch localStorage.
 */
export async function clearAppCaches(): Promise<number> {
  if (typeof caches === "undefined") return 0;
  try {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
    return names.length;
  } catch (e) {
    console.warn("Failed to clear caches:", e);
    return 0;
  }
}
