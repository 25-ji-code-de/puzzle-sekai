/**
 * One-shot SFX / voice playback.
 *
 * Sources:
 * - PIXI loader resources (move / land / effect aliases)
 * - pixi-sound aliases (character fall + group clear voices), registered lazily
 */
import sound from "pixi-sound";
import { app } from "../runtime";
import {
  sfxVol,
  voiceVol,
  SFX_MOVE_BASE,
  SFX_LAND_BASE,
  SFX_EFFECT_BASE,
} from "../settings";
import { characterData, groupSounds } from "../characters/data";

export type SfxChannel = "sfx" | "voice";

export { SFX_MOVE_BASE, SFX_LAND_BASE, SFX_EFFECT_BASE };

const ensuredAliases = new Set<string>();

/** Register a pixi-sound alias on first use (no boot-time voice download). */
const ensureSoundAlias = (key: string): void => {
  if (!key || ensuredAliases.has(key)) return;
  try {
    if (!sound.exists(key)) {
      sound.add(key, { url: key, preload: true });
    }
    ensuredAliases.add(key);
  } catch {
    /* ignore */
  }
};

/** Resolve a sound from loader resources or pixi-sound alias registry. */
export const resolveSound = (key: string) => {
  const fromLoader = app.loader.resources[key]?.sound;
  if (fromLoader) return fromLoader;
  ensureSoundAlias(key);
  try {
    if (sound.exists(key)) {
      return sound.find(key);
    }
  } catch {
    /* ignore */
  }
  return null;
};

/** Play a registered sound by key; no-op if missing. */
export const playLoadedSfx = (
  key: string,
  channel: SfxChannel,
  base: number,
): void => {
  const sfx = resolveSound(key);
  if (!sfx) return;
  const volume = channel === "voice" ? voiceVol(base) : sfxVol(base);
  try {
    sfx.play({ volume });
  } catch {
    /* ignore */
  }
};

/** Stop then play (used for move clicks so they don't stack). */
export const replayLoadedSfx = (
  key: string,
  channel: SfxChannel,
  base: number,
): void => {
  const sfx = resolveSound(key);
  if (!sfx) return;
  try {
    if (sfx.isPlaying) sfx.stop();
    const volume = channel === "voice" ? voiceVol(base) : sfxVol(base);
    sfx.play({ volume });
  } catch {
    /* ignore */
  }
};

/** Settings-panel SFX preview. */
export const playSfxPreview = (): void => {
  replayLoadedSfx("move", "sfx", SFX_MOVE_BASE);
};

const VOICE_PREVIEW_BASE = 0.5;
export const playVoicePreview = (): void => {
  const sample = characterData.find((c) => c.sounds?.fall?.length)?.sounds
    ?.fall?.[0];
  if (sample) {
    playLoadedSfx(sample, "voice", VOICE_PREVIEW_BASE);
    return;
  }
  playLoadedSfx("move", "voice", VOICE_PREVIEW_BASE);
};

/**
 * Optionally warm group-clear voices for units currently enabled.
 * Safe to call after match start; does not block.
 */
export const prefetchGroupVoices = (groupNames: string[]): void => {
  for (const g of groupNames) {
    const url = (groupSounds as Record<string, string | undefined>)[g];
    if (url) ensureSoundAlias(url);
  }
};
