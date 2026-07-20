/**
 * Volume channel helpers (BGM / SFX / voice).
 */
import type { GameSettings } from "./types";
import { getCurrentSettings } from "./store";
import { clamp } from "../util/clamp";

/** Clamp / coerce a stored volume percent (0–100). Invalid → default. */
export function clampVolumePercent(v: unknown, fallback: number = 100): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return clamp(Math.round(v), 0, 100);
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
