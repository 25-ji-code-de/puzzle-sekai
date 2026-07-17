/**
 * High-score persistence (per mode / time-attack duration).
 */
import type { GameMode, GameSettings, HighScoreRecord } from "./types";
import { getDifficultyLevel, isEntertainmentMode } from "./difficulty";
import { getCurrentSettings } from "./store";
import { getStoragePort } from "./storage";

export function getHighScoreKey(
  mode: GameMode,
  settings?: GameSettings,
): string {
  if (mode === "endless") return "highScore_endless";
  return `highScore_timeAttack_${settings?.timeAttackDuration || 90}`;
}

function getHighScoreDifficultyKey(
  mode: GameMode,
  settings?: GameSettings,
): string {
  return `${getHighScoreKey(mode, settings)}_difficulty`;
}

function getHighScoreEntertainmentKey(
  mode: GameMode,
  settings?: GameSettings,
): string {
  return `${getHighScoreKey(mode, settings)}_entertainment`;
}

export function loadHighScoreRecord(
  mode: GameMode,
  settings?: GameSettings,
): HighScoreRecord {
  try {
    const scoreKey = getHighScoreKey(mode, settings);
    const diffKey = getHighScoreDifficultyKey(mode, settings);
    const entKey = getHighScoreEntertainmentKey(mode, settings);
    const score = parseInt(getStoragePort().get(scoreKey) || "0", 10) || 0;
    const difficultyLevel =
      parseInt(getStoragePort().get(diffKey) || "0", 10) || 0;
    const entertainment = getStoragePort().get(entKey) === "1";
    return { score, difficultyLevel, entertainment };
  } catch {
    return { score: 0, difficultyLevel: 0, entertainment: false };
  }
}

export function loadHighScore(mode: GameMode, settings?: GameSettings): number {
  return loadHighScoreRecord(mode, settings).score;
}

export function saveHighScore(
  mode: GameMode,
  score: number,
  settings?: GameSettings,
): boolean {
  try {
    const current = loadHighScoreRecord(mode, settings);
    if (score > current.score) {
      const s = settings ?? getCurrentSettings();
      getStoragePort().set(getHighScoreKey(mode, settings), score.toString());
      getStoragePort().set(
        getHighScoreDifficultyKey(mode, settings),
        String(getDifficultyLevel(s)),
      );
      getStoragePort().set(
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
