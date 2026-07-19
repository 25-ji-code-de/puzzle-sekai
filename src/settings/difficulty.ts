/**
 * Difficulty rating and score multiplier breakdown.
 *
 * ★ = speedLevel + (groupCount - 3), clamped 1–7.
 * Final score mult = base(★) × fun × item × orientation (clamped 0.3–4).
 * Letter rank / dan use effective score (mult stripped) — see score/performance.ts.
 */
import {
  DEFAULT_FUN_MODES,
  FUN_MODE_DEFS,
  getFunModeMultiplier,
  isEntertainmentMode as funFlagsOn,
  scaleItemLinkedFactor,
} from "../fun/modes";
import { t } from "../i18n";
import {
  DEFAULT_SETTINGS,
  DifficultyLevel,
  GameSettings,
  ITEM_DROP_SCORE_FACTORS,
  SPAWN_ORIENTATION_SCORE_FACTORS,
  SPEED_MULTIPLIERS,
  SpawnOrientation,
  ItemDropRate,
  SpeedLevel,
  isItemDropRate,
  isSpawnOrientation,
} from "./types";
import { getCurrentSettings } from "./store";

export function getSpeedMultiplier(settings: GameSettings): number {
  return SPEED_MULTIPLIERS[settings.speedLevel];
}

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
  const i18nKey = `difficulty.${level}` as import("../i18n").MessageKey;
  const translated = t(i18nKey);
  return translated !== i18nKey ? translated : `${level}`;
}

/** Difficulty colors (Project SEKAI style) */
export const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  1: "#88ee55",
  2: "#55ccee",
  3: "#ffbb33",
  4: "#ff5577",
  5: "#bb66ff",
  6: "#ddbbff",
  7: "#ff88cc",
};

/** Append uses a pink → lavender gradient */
export const APPEND_GRADIENT = "linear-gradient(90deg, #ff88cc, #ddbbff)";

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

/**
 * Base score mult by ★ (mild curve; rank/dan strip mult so this is display reward).
 * ★1 0.55 · ★2 0.85 · ★3 1.15 · ★4 1.50 · ★5 1.95 · ★6 2.50 · ★7 3.00
 */
export const BASE_SCORE_MULTIPLIERS: Record<DifficultyLevel, number> = {
  1: 0.55,
  2: 0.85,
  3: 1.15,
  4: 1.5,
  5: 1.95,
  6: 2.5,
  7: 3.0,
};

/** Base score multiplier from difficulty only ~0.55 (★1) … ~3.0 (★7) */
export function getBaseScoreMultiplier(settings: GameSettings): number {
  const d = getDifficultyLevel(settings);
  return BASE_SCORE_MULTIPLIERS[d];
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
      label: t("settings.difficulty.itemLine", {
        rate: rate === 0 ? t("settings.item.none") : `${rate}%`,
      }),
      factor: item,
    },
    {
      label: t("settings.difficulty.orientLine", {
        orient: t(
          `settings.orientation.${orientation}` as import("../i18n").MessageKey,
        ),
      }),
      factor: orient,
    },
  ];

  for (const def of FUN_MODE_DEFS) {
    if (!flags[def.id]) continue;
    const factor = def.itemLinked
      ? scaleItemLinkedFactor(def.scoreFactor, rate)
      : def.scoreFactor;
    const funName = t(`fun.${def.id}.name` as import("../i18n").MessageKey);
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

/** Initial sprite.rotation for character pieces under current setting. */
export function getSpawnRotation(settings?: GameSettings): number {
  const s = settings ?? getCurrentSettings();
  return s.spawnOrientation === "upright" ? 0 : Math.PI;
}

// ---- i18n labels ----

export const getSpeedLabel = (level: SpeedLevel): string =>
  t(
    `settings.speed.${
      (["slow", "normal", "fast", "faster", "hell"] as const)[level - 1]
    }`,
  );

export const getTimeLabel = (
  duration: import("./types").TimeAttackDuration,
): string => t("settings.ta.duration", { seconds: duration });

export const getItemDropLabel = (rate: ItemDropRate): string =>
  rate === 0 ? t("settings.item.none") : `${rate}%`;
