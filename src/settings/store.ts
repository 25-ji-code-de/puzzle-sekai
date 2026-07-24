/**
 * Settings singleton + localStorage persistence + game mode.
 *
 * On disk (v1): `{ version: 1, ...GameSettings }`.
 * Legacy (v0): flat GameSettings without `version` — still accepted and rewritten.
 *
 * Match-scoped override: daily freezes gameplay rules without writing storage.
 * {@link getCurrentSettings} returns the override while a match has one active;
 * {@link getUserSettings} always returns the persisted prefs.
 */
import { DEFAULT_FUN_MODES, normalizeFunModes } from "../fun/modes";
import { utcDateKey } from "../domain/daily";
import { resolveDefaultDisplayMode } from "../ui/display-policy";
import {
  DEFAULT_SETTINGS,
  GAME_GROUPS,
  GameMode,
  GameSettings,
  GroupName,
  SETTINGS_KEY,
  SETTINGS_VERSION,
  isItemDropRate,
  isSpawnOrientation,
  isDisplayMode,
  isSpeedLevel,
  isTimeAttackDuration,
} from "./types";
import { clampVolumePercent } from "./volume";
import { getStoragePort } from "./storage";
import { devWarn } from "../util/dev-log";
import { safeJsonParse } from "../util/json";

const defaultSettings = (): GameSettings => ({
  ...DEFAULT_SETTINGS,
  selectedGroups: [...GAME_GROUPS],
  funModes: { ...DEFAULT_FUN_MODES },
  // Phone → fullscreen, desktop → windowed (only when no saved preference).
  displayMode: resolveDefaultDisplayMode(),
});

/** Coerce selectedGroups to 3–5 known units; else full roster. */
const normalizeSelectedGroups = (raw: unknown): GroupName[] => {
  if (!Array.isArray(raw)) return [...GAME_GROUPS];
  const filtered = raw.filter(
    (g): g is GroupName =>
      typeof g === "string" && (GAME_GROUPS as readonly string[]).includes(g),
  );
  if (filtered.length < 3 || filtered.length > 5) return [...GAME_GROUPS];
  return filtered;
};

/**
 * Whitelist every GameSettings field. Unknown / out-of-range → default.
 * Safe for load, update, and migrate paths.
 */
export function normalizeSettings(raw: unknown): GameSettings {
  const src =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  return {
    speedLevel: isSpeedLevel(src.speedLevel)
      ? src.speedLevel
      : DEFAULT_SETTINGS.speedLevel,
    timeAttackDuration: isTimeAttackDuration(src.timeAttackDuration)
      ? src.timeAttackDuration
      : DEFAULT_SETTINGS.timeAttackDuration,
    selectedGroups: normalizeSelectedGroups(src.selectedGroups),
    funModes: normalizeFunModes(src.funModes),
    itemDropRate: isItemDropRate(src.itemDropRate)
      ? src.itemDropRate
      : DEFAULT_SETTINGS.itemDropRate,
    spawnOrientation: isSpawnOrientation(src.spawnOrientation)
      ? src.spawnOrientation
      : DEFAULT_SETTINGS.spawnOrientation,
    bgmVolume: clampVolumePercent(src.bgmVolume, DEFAULT_SETTINGS.bgmVolume),
    sfxVolume: clampVolumePercent(src.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    voiceVolume: clampVolumePercent(
      src.voiceVolume,
      DEFAULT_SETTINGS.voiceVolume,
    ),
    lowPerformance: src.lowPerformance === true,
    displayMode: isDisplayMode(src.displayMode)
      ? src.displayMode
      : resolveDefaultDisplayMode(),
  };
}

/**
 * Map a parsed JSON value (any historical shape) onto current GameSettings.
 * - missing / non-object → defaults
 * - no `version` (v0 legacy flat) → normalize fields
 * - version 1 → strip version, normalize
 * - unknown future version → warn + best-effort normalize (forward compatible)
 */
export function migrateSettingsPayload(parsed: unknown): GameSettings {
  if (!parsed || typeof parsed !== "object") return defaultSettings();

  const o = parsed as Record<string, unknown>;
  const version =
    typeof o.version === "number" && Number.isFinite(o.version) ? o.version : 0;

  if (version > SETTINGS_VERSION) {
    devWarn(
      `[settings] newer envelope v${version} (app supports v${SETTINGS_VERSION}); best-effort normalize`,
    );
  }

  // Flat envelope: version sits beside settings fields (v0 has no version).
  const { version: _v, ...body } = o;
  return normalizeSettings(body);
}

export function loadSettings(): GameSettings {
  try {
    const saved = getStoragePort().get(SETTINGS_KEY);
    if (saved) {
      const parsed = safeJsonParse(saved);
      if (parsed != null) return migrateSettingsPayload(parsed);
    }
  } catch (e) {
    devWarn("Failed to load settings:", e);
  }
  return defaultSettings();
}

export function saveSettings(settings: GameSettings): void {
  try {
    const envelope = {
      version: SETTINGS_VERSION,
      ...settings,
    };
    getStoragePort().set(SETTINGS_KEY, JSON.stringify(envelope));
  } catch (e) {
    devWarn("Failed to save settings:", e);
  }
}

let currentSettings: GameSettings = loadSettings();

/**
 * Optional per-match overlay (daily locked rules). Not persisted.
 * Cleared on return-to-menu / non-daily start.
 */
let matchSettingsOverride: GameSettings | null = null;

/** Settings used by gameplay / score (override if a match installed one). */
export function getCurrentSettings(): GameSettings {
  return matchSettingsOverride ?? currentSettings;
}

/** Persisted user prefs (ignore match override). Menu / settings panel. */
export function getUserSettings(): GameSettings {
  return currentSettings;
}

export function beginMatchSettingsOverride(settings: GameSettings): void {
  matchSettingsOverride = normalizeSettings(settings);
}

export function clearMatchSettingsOverride(): void {
  matchSettingsOverride = null;
}

export function hasMatchSettingsOverride(): boolean {
  return matchSettingsOverride != null;
}

export function updateCurrentSettings(settings: GameSettings): void {
  currentSettings = normalizeSettings(settings);
  saveSettings(currentSettings);
  // Keep renderer buffer resolution in sync with the toggle.
  void import("../runtime").then(({ applyPerformanceMode }) => {
    applyPerformanceMode(currentSettings.lowPerformance);
  });
}

/** Reset in-memory settings to defaults (after wiping storage). */
export function resetCurrentSettingsToDefaults(): void {
  matchSettingsOverride = null;
  currentSettings = defaultSettings();
  void import("../runtime").then(({ applyPerformanceMode }) => {
    applyPerformanceMode(currentSettings.lowPerformance);
  });
}

let currentGameMode: GameMode = "endless";
/** UTC date key latched when entering daily mode (stable across midnight mid-match). */
let activeDailyDateKey: string | null = null;

export function getCurrentGameMode(): GameMode {
  return currentGameMode;
}

/**
 * Active daily challenge date (`YYYY-MM-DD` UTC), or null outside daily mode.
 * Latched at {@link setCurrentGameMode}("daily") so a long match keeps one day.
 */
export function getActiveDailyDateKey(): string | null {
  return activeDailyDateKey;
}

/**
 * Drop the latched daily date without changing {@link getCurrentGameMode}.
 * Call on return-to-menu so the high-score column falls back to “today”
 * (utcDateKey) after the player leaves a match.
 */
export function clearActiveDailyDateKey(): void {
  activeDailyDateKey = null;
}

/** Override the active daily key for replay / restoration flows. */
export function setActiveDailyDateKey(dateKey: string | null): void {
  activeDailyDateKey = dateKey;
}

export function setCurrentGameMode(mode: GameMode): void {
  currentGameMode = mode;
  // Always refresh the date key when selecting daily from the menu so a new
  // day is picked after midnight. Match restart does not call this — mid-match
  // the latched key stays put even if UTC day rolls over.
  activeDailyDateKey = mode === "daily" ? utcDateKey() : null;
}
