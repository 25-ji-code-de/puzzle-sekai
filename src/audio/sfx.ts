/**
 * One-shot SFX / voice playback.
 *
 * Sources:
 * - PIXI loader resources (move / land / effect aliases)
 * - pixi-sound aliases registered at boot (character fall + group clear voices)
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
import { characterData } from "../characters/data";

export type SfxChannel = "sfx" | "voice";

export { SFX_MOVE_BASE, SFX_LAND_BASE, SFX_EFFECT_BASE };

/** Resolve a sound from loader resources or pixi-sound alias registry. */
const resolveSound = (key: string) => {
  const fromLoader = app.loader.resources[key]?.sound;
  if (fromLoader) return fromLoader;
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
  sfx.play({ volume });
};

/** Stop then play (used for move clicks so they don't stack). */
export const replayLoadedSfx = (
  key: string,
  channel: SfxChannel,
  base: number,
): void => {
  const sfx = resolveSound(key);
  if (!sfx) return;
  if (sfx.isPlaying) sfx.stop();
  const volume = channel === "voice" ? voiceVol(base) : sfxVol(base);
  sfx.play({ volume });
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
