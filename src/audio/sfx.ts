/**
 * One-shot SFX / voice from textures already registered on the PIXI loader.
 */
import { app } from "../index";
import { sfxVol, voiceVol } from "../settings";

export type SfxChannel = "sfx" | "voice";

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
