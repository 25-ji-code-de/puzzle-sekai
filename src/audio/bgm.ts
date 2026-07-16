/**
 * Lazy BGM loader via pixi-sound.
 *
 * Boot no longer blocks on ~5.5 MB of music. Tracks are fetched by scene:
 *  - menu → bgm161 (prefetched once the boot shell is ready; played on click)
 *  - play → bgm038 + bgm168 (idle-prefetched from the menu; also on match start)
 *  - over → bgm182_1 + bgm182_2 (idle-prefetched; also just-in-time at game over)
 *
 * Sound.add({ preload: true }) downloads once and caches the Sound instance.
 * Subsequent ensureBgm() calls resolve immediately from the in-memory map.
 */
import sound from "pixi-sound";
import bgm038 from "../assets/sounds/038.mp3";
import bgm168 from "../assets/sounds/168.mp3";
import bgm161 from "../assets/sounds/161.mp3";
import bgm182_1 from "../assets/sounds/182.1.mp3";
import bgm182_2 from "../assets/sounds/182.2.mp3";
import { getVolumeScale } from "../settings";
export type BgmKey = "bgm038" | "bgm168" | "bgm161" | "bgm182_1" | "bgm182_2";
/** Legacy absolute volume passed to play() — classic loudness at 100% slider. */
export const BGM_BASE_VOLUME = 0.3;
const BGM_URLS: Record<BgmKey, string> = {
  bgm038,
  bgm168,
  bgm161,
  bgm182_1,
  bgm182_2,
};
const cache = new Map<BgmKey, PIXI.sound.Sound>();
const inflight = new Map<BgmKey, Promise<PIXI.sound.Sound | null>>();
/** Currently audible BGM instance (menu / play / game-over). */
let liveBgm: PIXI.sound.Sound | null = null;
/**
 * Remember the active track and apply the BGM channel gain to Sound.volume.
 * pixi-sound final loudness = play(volume) × Sound.volume × context.volume,
 * so we keep play() at BGM_BASE_VOLUME and put the user % only on Sound.volume.
 */
export const setLiveBgm = (s: PIXI.sound.Sound | null): void => {
  liveBgm = s;
  if (s) {
    try {
      s.volume = getVolumeScale("bgm");
    } catch {
      /* ignore */
    }
  }
};
/** Push current BGM slider onto the active track (and any cached aliases). */
export const applyBgmVolume = (): void => {
  const scale = getVolumeScale("bgm");
  try {
    if (liveBgm) liveBgm.volume = scale;
  } catch {
    /* ignore */
  }
  // Keep idle cached tracks in sync so the next play isn't stuck at an old gain.
  cache.forEach((s) => {
    try {
      s.volume = scale;
    } catch {
      /* ignore */
    }
  });
};
/** Play move.mp3 at the current SFX slider (throttled by caller). */
export { playSfxPreview, playVoicePreview } from "./sfx";
export const unlockAudio = (): void => {
  try {
    const ctx = (sound as any).context?.audioContext as AudioContext | undefined;
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
  } catch {
    /* ignore */
  }
};
const loadOne = (key: BgmKey): Promise<PIXI.sound.Sound | null> => {
  const hit = cache.get(key);
  if (hit?.isLoaded) return Promise.resolve(hit);
  const pending = inflight.get(key);
  if (pending) return pending;
  const promise = new Promise<PIXI.sound.Sound | null>((resolve) => {
    // Prefer an already-registered alias (e.g. a previous partial load).
    if (sound.exists(key)) {
      const existing = sound.find(key);
      if (existing?.isLoaded) {
        cache.set(key, existing);
        resolve(existing);
        return;
      }
    }
    const s = sound.add(key, {
      url: BGM_URLS[key],
      preload: true,
      // singleInstance keeps pause/resume predictable for looping menu tracks.
      singleInstance: true,
      loaded: (err, loadedSound) => {
        inflight.delete(key);
        if (err || !loadedSound) {
          console.warn(`Failed to load BGM ${key}:`, err);
          resolve(null);
          return;
        }
        cache.set(key, loadedSound);
        resolve(loadedSound);
      },
    });
    // If the library already had it fully loaded, resolve sync-style.
    if (s.isLoaded) {
      inflight.delete(key);
      cache.set(key, s);
      resolve(s);
    }
  });
  inflight.set(key, promise);
  return promise;
};
/** Load one or more BGM tracks; resolves when all have finished (or failed). */
export const ensureBgm = (
  ...keys: BgmKey[]
): Promise<(PIXI.sound.Sound | null)[]> => Promise.all(keys.map(loadOne));
/** Convenience: load and return a single track (or null on failure). */
export const getBgm = async (key: BgmKey): Promise<PIXI.sound.Sound | null> => {
  const [s] = await ensureBgm(key);
  return s;
};
/** Sync peek — only returns a sound that is already fully loaded. */
export const peekBgm = (key: BgmKey): PIXI.sound.Sound | null => {
  const s = cache.get(key);
  return s?.isLoaded ? s : null;
};
/**
 * Kick off background downloads without awaiting. Safe to call repeatedly;
 * already-loaded / in-flight keys are no-ops.
 */
export const prefetchBgm = (...keys: BgmKey[]): void => {
  for (const key of keys) void loadOne(key);
};
/** Prefetch the menu loop so click-to-continue usually plays instantly. */
export const prefetchMenuBgm = (): void => {
  prefetchBgm("bgm161");
};
/** Menu idle prefetch: play tracks + game-over stinger, so start/end are warm. */
export const prefetchPlayBgm = (): void => {
  prefetchBgm("bgm038", "bgm168", "bgm182_1", "bgm182_2");
};
/** Hard-stop every known BGM alias (loaded or not). */
export const stopAllBgmAliases = (): void => {
  (Object.keys(BGM_URLS) as BgmKey[]).forEach((key) => {
    try {
      if (sound.exists(key)) sound.find(key)?.stop();
    } catch {
      /* ignore */
    }
  });
  cache.forEach((s) => {
    try {
      s.stop();
    } catch {
      /* ignore */
    }
  });
  liveBgm = null;
};
