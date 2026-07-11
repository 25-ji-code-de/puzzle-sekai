// Game settings management

export type SpeedLevel = 1 | 2 | 3 | 4 | 5;
export type TimeAttackDuration = 60 | 90 | 120 | 180;

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
}

// Speed multipliers for each level
export const SPEED_MULTIPLIERS: Record<SpeedLevel, number> = {
  1: 0.6,   // 慢速 (Slow)
  2: 1.0,   // 普通 (Normal)
  3: 1.5,   // 快速 (Fast)
  4: 2.0,   // 极速 (Very Fast)
  5: 3.0,   // 地狱 (Hell)
};

// Speed level labels
export const SPEED_LABELS: Record<SpeedLevel, string> = {
  1: "慢速",
  2: "普通",
  3: "快速",
  4: "极速",
  5: "地狱",
};

// Time attack duration labels
export const TIME_LABELS: Record<TimeAttackDuration, string> = {
  60: "60秒",
  90: "90秒",
  120: "120秒",
  180: "180秒",
};

// Group display names (Japanese)
export const GROUP_LABELS: Record<GroupName, string> = {
  "Leo/need": "Leo/need",
  "MORE MORE JUMP!": "MMJ",
  "Vivid BAD SQUAD": "VBS",
  "Wonderlands×Showtime": "WxS",
  "25時、ナイトコードで。": "25時、ナイトコードで。",
};

// Default settings (all 5 groups selected)
const DEFAULT_SETTINGS: GameSettings = {
  speedLevel: 2,
  timeAttackDuration: 90,
  selectedGroups: [...GAME_GROUPS],
};

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
        // Filter to only valid groups
        selectedGroups = selectedGroups.filter((g: string) => GAME_GROUPS.includes(g as GroupName));
        if (selectedGroups.length < 3) {
          selectedGroups = [...GAME_GROUPS];
        }
      }

      return {
        speedLevel: parsed.speedLevel || DEFAULT_SETTINGS.speedLevel,
        timeAttackDuration: parsed.timeAttackDuration || DEFAULT_SETTINGS.timeAttackDuration,
        selectedGroups: selectedGroups as GroupName[],
      };
    }
  } catch (e) {
    console.warn("Failed to load settings:", e);
  }
  return { ...DEFAULT_SETTINGS };
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

// Game mode type
export type GameMode = "endless" | "timeAttack";

// Get high score key for a specific mode
export function getHighScoreKey(mode: GameMode, settings?: GameSettings): string {
  if (mode === "endless") return "highScore_endless";
  return `highScore_timeAttack_${settings?.timeAttackDuration || 90}`;
}

// Load high score for a specific mode
export function loadHighScore(mode: GameMode, settings?: GameSettings): number {
  try {
    const key = getHighScoreKey(mode, settings);
    const saved = localStorage.getItem(key);
    return saved ? parseInt(saved, 10) || 0 : 0;
  } catch (e) {
    return 0;
  }
}

// Save high score for a specific mode
export function saveHighScore(mode: GameMode, score: number, settings?: GameSettings): boolean {
  try {
    const key = getHighScoreKey(mode, settings);
    const current = loadHighScore(mode, settings);
    if (score > current) {
      localStorage.setItem(key, score.toString());
      return true; // New high score
    }
    return false;
  } catch (e) {
    return false;
  }
}

// Current game settings (singleton)
let currentSettings: GameSettings = loadSettings();

export function getCurrentSettings(): GameSettings {
  return currentSettings;
}

export function updateCurrentSettings(settings: GameSettings): void {
  currentSettings = settings;
  saveSettings(settings);
}

// Current game mode
let currentGameMode: GameMode = "endless";

export function getCurrentGameMode(): GameMode {
  return currentGameMode;
}

export function setCurrentGameMode(mode: GameMode): void {
  currentGameMode = mode;
}
