/**
 * One-shot SFX / voice playback.
 *
 * Sources:
 * - PIXI loader resources (move / land / effect aliases)
 * - pixi-sound aliases (character fall + group clear voices), registered lazily
 *
 * Important: never call Sound.play() while !isLoaded. pixi-sound's play() path
 * re-enters media.load()/_decode() and assigns AudioBufferSourceNode.buffer a
 * second time, which throws InvalidStateError (unrecoverable from our try/catch
 * because it fires in the XHR/decode callback).
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
import { groupSounds } from "../characters/data";
/** Fixed sample for the settings voice-volume slider. */
import voicePreviewUrl from "../assets/sounds/chara/emu_3.mp3";

export type SfxChannel = "sfx" | "voice";

export { SFX_MOVE_BASE, SFX_LAND_BASE, SFX_EFFECT_BASE };

type PixiSound = PIXI.sound.Sound;

const ensuredAliases = new Set<string>();
/** In-flight waiters keyed by alias / resource key so we only poll once. */
const readyWaiters = new Map<string, Promise<PixiSound | null>>();

const LOAD_WAIT_MS = 30_000;
const LOAD_POLL_MS = 32;

/**
 * Resolve when a Sound finishes preloading. Does NOT call play() or load() —
 * those re-enter decode on the same bufferSource in pixi-sound@3.
 */
export const whenSoundReady = (
  key: string,
  sfx: PixiSound,
): Promise<PixiSound | null> => {
  if (sfx.isLoaded) return Promise.resolve(sfx);
  const pending = readyWaiters.get(key);
  if (pending) return pending;

  const promise = new Promise<PixiSound | null>((resolve) => {
    const t0 = Date.now();
    const tick = () => {
      try {
        if (sfx.isLoaded) {
          readyWaiters.delete(key);
          resolve(sfx);
          return;
        }
      } catch {
        readyWaiters.delete(key);
        resolve(null);
        return;
      }
      if (Date.now() - t0 > LOAD_WAIT_MS) {
        readyWaiters.delete(key);
        resolve(null);
        return;
      }
      setTimeout(tick, LOAD_POLL_MS);
    };
    tick();
  });
  readyWaiters.set(key, promise);
  return promise;
};

/** Register a pixi-sound alias on first use (no boot-time voice download). */
const ensureSoundAlias = (key: string): void => {
  if (!key || ensuredAliases.has(key)) return;
  try {
    if (!sound.exists(key)) {
      // preload only — never autoPlay; callers wait via whenSoundReady.
      sound.add(key, { url: key, preload: true, singleInstance: false });
    }
    ensuredAliases.add(key);
  } catch {
    /* ignore */
  }
};

/** Resolve a sound from loader resources or pixi-sound alias registry. */
export const resolveSound = (key: string) => {
  const res = app.loader.resources[key];
  // Prefer resource.sound; if middleware didn't attach it, re-register via URL.
  if (res?.sound) return res.sound;
  const resUrl =
    (res as { url?: string; data?: string } | undefined)?.url ??
    (res as { data?: string } | undefined)?.data;
  if (resUrl && typeof resUrl === "string") {
    ensureSoundAlias(resUrl);
    try {
      if (sound.exists(resUrl)) return sound.find(resUrl);
    } catch {
      /* ignore */
    }
  }
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

const channelVolume = (channel: SfxChannel, base: number): number =>
  channel === "voice" ? voiceVol(base) : sfxVol(base);

/** Play only after isLoaded — avoids pixi-sound double-decode race. */
const playReady = (
  key: string,
  sfx: PixiSound,
  volume: number,
  opts?: { stopFirst?: boolean },
): void => {
  const run = (ready: PixiSound) => {
    try {
      if (opts?.stopFirst && ready.isPlaying) ready.stop();
      ready.play({ volume });
    } catch {
      /* ignore — SFX is best-effort */
    }
  };

  if (sfx.isLoaded) {
    run(sfx);
    return;
  }
  void whenSoundReady(key, sfx).then((ready) => {
    if (ready) run(ready);
  });
};

/** Play a registered sound by key; no-op if missing. */
export const playLoadedSfx = (
  key: string,
  channel: SfxChannel,
  base: number,
): void => {
  const sfx = resolveSound(key);
  if (!sfx) return;
  playReady(key, sfx, channelVolume(channel, base));
};

/** Stop then play (used for move clicks so they don't stack). */
export const replayLoadedSfx = (
  key: string,
  channel: SfxChannel,
  base: number,
): void => {
  const sfx = resolveSound(key);
  if (!sfx) return;
  playReady(key, sfx, channelVolume(channel, base), { stopFirst: true });
};

/** Settings-panel SFX preview. */
export const playSfxPreview = (): void => {
  replayLoadedSfx("move", "sfx", SFX_MOVE_BASE);
};

const VOICE_PREVIEW_ALIAS = "voice-preview-emu3";
const VOICE_PREVIEW_BASE = 0.5;

/** Settings-panel voice preview — always emu_3, not match-dependent. */
export const playVoicePreview = (): void => {
  try {
    if (!sound.exists(VOICE_PREVIEW_ALIAS)) {
      sound.add(VOICE_PREVIEW_ALIAS, {
        url: voicePreviewUrl,
        preload: true,
        singleInstance: true,
      });
    }
    const sfx = sound.find(VOICE_PREVIEW_ALIAS);
    if (sfx) {
      playReady(VOICE_PREVIEW_ALIAS, sfx, voiceVol(VOICE_PREVIEW_BASE), {
        stopFirst: true,
      });
      return;
    }
  } catch {
    /* fall through */
  }
  // Last resort if registration fails mid-session.
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
