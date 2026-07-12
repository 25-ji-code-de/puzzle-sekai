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

// ---- Difficulty rating (speed + group count; fewer groups = easier) ----

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  1: "★1 かんたん",
  2: "★2 ふつう",
  3: "★3 ちょっとむず",
  4: "★4 むずかしい",
  5: "★5 かなりむず",
  6: "★6 ハード",
  7: "★7 ヘル",
};

/** Difficulty 1–7: speedLevel + (groupCount - 3). More groups = harder. */
export function getDifficultyLevel(settings: GameSettings): DifficultyLevel {
  const groups = Math.min(5, Math.max(3, settings.selectedGroups.length));
  const level = settings.speedLevel + (groups - 3);
  return Math.min(7, Math.max(1, level)) as DifficultyLevel;
}

export function getDifficultyLabel(
  settingsOrLevel: GameSettings | DifficultyLevel,
): string {
  const level =
    typeof settingsOrLevel === "number"
      ? settingsOrLevel
      : getDifficultyLevel(settingsOrLevel);
  return DIFFICULTY_LABELS[level as DifficultyLevel] ?? `★${level}`;
}

/** Score multiplier ~0.5 (★1) … ~3.0 (★7) */
export function getScoreMultiplier(settings: GameSettings): number {
  const d = getDifficultyLevel(settings);
  return 0.5 + (d - 1) * (2.5 / 6);
}

// Game mode type
export type GameMode = "endless" | "timeAttack";

export type HighScoreRecord = {
  score: number;
  /** Difficulty when the high score was achieved; 0 = unknown/legacy */
  difficultyLevel: number;
};

// Get high score key for a specific mode (not split by difficulty)
export function getHighScoreKey(mode: GameMode, settings?: GameSettings): string {
  if (mode === "endless") return "highScore_endless";
  return `highScore_timeAttack_${settings?.timeAttackDuration || 90}`;
}

function getHighScoreDifficultyKey(mode: GameMode, settings?: GameSettings): string {
  return `${getHighScoreKey(mode, settings)}_difficulty`;
}

// Load high score + difficulty record for a mode
export function loadHighScoreRecord(
  mode: GameMode,
  settings?: GameSettings,
): HighScoreRecord {
  try {
    const scoreKey = getHighScoreKey(mode, settings);
    const diffKey = getHighScoreDifficultyKey(mode, settings);
    const score = parseInt(localStorage.getItem(scoreKey) || "0", 10) || 0;
    const difficultyLevel =
      parseInt(localStorage.getItem(diffKey) || "0", 10) || 0;
    return { score, difficultyLevel };
  } catch {
    return { score: 0, difficultyLevel: 0 };
  }
}

// Load high score number only (compat)
export function loadHighScore(mode: GameMode, settings?: GameSettings): number {
  return loadHighScoreRecord(mode, settings).score;
}

// Save high score if higher; also store difficulty of that run
export function saveHighScore(
  mode: GameMode,
  score: number,
  settings?: GameSettings,
): boolean {
  try {
    const current = loadHighScoreRecord(mode, settings);
    if (score > current.score) {
      localStorage.setItem(getHighScoreKey(mode, settings), score.toString());
      const level = settings
        ? getDifficultyLevel(settings)
        : getDifficultyLevel(getCurrentSettings());
      localStorage.setItem(
        getHighScoreDifficultyKey(mode, settings),
        String(level),
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
