/**
 * One-shot SFX / voice from textures already registered on the PIXI loader.
 */
import { app } from "../runtime";
import {
  sfxVol,
  voiceVol,
  SFX_MOVE_BASE,
  SFX_LAND_BASE,
  SFX_EFFECT_BASE,
} from "../settings";

export type SfxChannel = "sfx" | "voice";

export { SFX_MOVE_BASE, SFX_LAND_BASE, SFX_EFFECT_BASE };

/** Play a loader-registered sound by resource key; no-op if missing. */
export const playLoadedSfx = (
  key: string,
  channel: SfxChannel,
  base: number,
): void => {
  const sfx = app.loader.resources[key]?.sound;
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
  const sfx = app.loader.resources[key]?.sound;
  if (!sfx) return;
  if (sfx.isPlaying) sfx.stop();
  const volume = channel === "voice" ? voiceVol(base) : sfxVol(base);
  sfx.play({ volume });
};

/** Settings-panel previews — same channel path as gameplay. */
export const playSfxPreview = (): void => {
  replayLoadedSfx("move", "sfx", SFX_MOVE_BASE);
};

const VOICE_PREVIEW_BASE = 0.5;
export const playVoicePreview = (): void => {
  // Prefer a known short voice if present; fall back to move at voice channel.
  const keys = Object.keys(app.loader.resources);
  const voiceKey = keys.find(
    (k) =>
      k.includes("ichika") ||
      k.includes("saki") ||
      (app.loader.resources[k] as { sound?: unknown })?.sound,
  );
  if (voiceKey && app.loader.resources[voiceKey]?.sound) {
    playLoadedSfx(voiceKey, "voice", VOICE_PREVIEW_BASE);
  } else {
    playLoadedSfx("move", "voice", VOICE_PREVIEW_BASE);
  }
};
