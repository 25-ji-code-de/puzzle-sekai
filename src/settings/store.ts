/**
 * Settings singleton + localStorage persistence + game mode.
 */
import {
  DEFAULT_FUN_MODES,
  normalizeFunModes,
} from "../fun/modes";
import {
  DEFAULT_SETTINGS,
  GAME_GROUPS,
  GameMode,
  GameSettings,
  GroupName,
  SETTINGS_KEY,
  isItemDropRate,
  isSpawnOrientation,
} from "./types";
import { clampVolumePercent } from "./volume";
import { getStoragePort } from "./storage";

export function loadSettings(): GameSettings {
  try {
    const saved = getStoragePort().get(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);

      let selectedGroups = parsed.selectedGroups;
      if (
        !Array.isArray(selectedGroups) ||
        selectedGroups.length < 3 ||
        selectedGroups.length > 5
      ) {
        selectedGroups = [...GAME_GROUPS];
      } else {
        selectedGroups = selectedGroups.filter((g: string) =>
          GAME_GROUPS.includes(g as GroupName),
        );
        if (selectedGroups.length < 3) {
          selectedGroups = [...GAME_GROUPS];
        }
      }

      return {
        speedLevel: parsed.speedLevel || DEFAULT_SETTINGS.speedLevel,
        timeAttackDuration:
          parsed.timeAttackDuration || DEFAULT_SETTINGS.timeAttackDuration,
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

export function saveSettings(settings: GameSettings): void {
  try {
    getStoragePort().set(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("Failed to save settings:", e);
  }
}

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

/** Reset in-memory settings to defaults (after wiping storage). */
export function resetCurrentSettingsToDefaults(): void {
  currentSettings = {
    ...DEFAULT_SETTINGS,
    selectedGroups: [...GAME_GROUPS],
    funModes: { ...DEFAULT_FUN_MODES },
  };
}

let currentGameMode: GameMode = "endless";

export function getCurrentGameMode(): GameMode {
  return currentGameMode;
}

export function setCurrentGameMode(mode: GameMode): void {
  currentGameMode = mode;
}
