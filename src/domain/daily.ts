/**
 * Daily challenge: one shared seed (and frozen gameplay rules) per UTC day
 * so every player faces the same bag / item stream that calendar day.
 *
 * Presentation prefs (volume, lowPerformance) stay with the user; only fields
 * that affect the discrete spawn stream or score mult are locked.
 */
import { DEFAULT_FUN_MODES } from "../fun/modes";
import {
  DEFAULT_SETTINGS,
  GAME_GROUPS,
  type GameSettings,
  type GroupName,
} from "../settings/types";
import { formatUtcDateKey, isUtcDateKeyFormat } from "../util/date-key";
import { fnv1a32 } from "../util/hash";

/** Canonical salt so seed space does not collide with ad-hoc repro seeds. */
const DAILY_SEED_SALT = "puzzle-sekai-daily:";

/**
 * UTC calendar day as `YYYY-MM-DD`.
 * Using UTC keeps the “same challenge for everyone today” window global
 * rather than flipping at each player’s local midnight.
 */
export function utcDateKey(date: Date = new Date()): string {
  return formatUtcDateKey(date);
}

/** True if string looks like a UTC date key (no calendar validation). */
export function isUtcDateKey(value: unknown): value is string {
  return isUtcDateKeyFormat(value);
}

/**
 * Deterministic 32-bit seed from a date key (FNV-1a 32).
 * Same key → same seed on every client / session.
 */
export function dailySeed(dateKey: string = utcDateKey()): number {
  return fnv1a32(DAILY_SEED_SALT + dateKey);
}

/**
 * Gameplay rules locked for daily matches.
 * Full unit roster, standard (no fun modes), medium speed, default item rate,
 * classic inverted spawn — chosen so difficulty ★ and mult are stable for all.
 */
export const DAILY_GAMEPLAY_RULES: Pick<
  GameSettings,
  | "speedLevel"
  | "selectedGroups"
  | "funModes"
  | "itemDropRate"
  | "spawnOrientation"
> = {
  speedLevel: 2,
  selectedGroups: [...GAME_GROUPS] as GroupName[],
  funModes: { ...DEFAULT_FUN_MODES },
  itemDropRate: 10,
  spawnOrientation: "inverted",
};

/**
 * Merge locked daily rules onto the player’s current prefs.
 * Volumes / lowPerformance / timeAttackDuration keep the user’s values
 * (duration is unused in daily; volumes are presentation-only).
 */
export function dailyMatchSettings(user: GameSettings): GameSettings {
  return {
    ...user,
    ...DAILY_GAMEPLAY_RULES,
    selectedGroups: [...DAILY_GAMEPLAY_RULES.selectedGroups],
    funModes: { ...DAILY_GAMEPLAY_RULES.funModes },
  };
}

/** Convenience: frozen rules alone as a full settings object (tests / defaults). */
export function defaultDailySettings(): GameSettings {
  return dailyMatchSettings({
    ...DEFAULT_SETTINGS,
    selectedGroups: [...GAME_GROUPS],
    funModes: { ...DEFAULT_FUN_MODES },
  });
}
