/**
 * Lazy BGM loader via pixi-sound.
 *
 * Boot no longer blocks on multi-MB of music. Tracks are fetched by scene:
 *  - menu → bgm161_1 intro + bgm161_2 loop (prefetched once boot shell ready)
 *  - play → bgm038 / bgm168 (after first piece texture — see bandwidth-gate)
 *  - over → bgm182_1 + bgm182_2 (just-in-time at game over; optional idle warm)
 *
 * Sound.add({ preload: true }) downloads once and caches the Sound instance.
 * Subsequent ensureBgm() calls resolve immediately from the in-memory map.
 *
 * Noncritical play/over downloads wait on whenAudioAllowed() so they do not
 * steal bandwidth from the first falling-piece texture on slow networks.
 */
import sound from "pixi-sound";
import bgm038 from "../assets/sounds/038.mp3";
import bgm168 from "../assets/sounds/168.mp3";
import bgm161_1 from "../assets/sounds/161.1.mp3";
import bgm161_2 from "../assets/sounds/161.2.mp3";
import bgm182_1 from "../assets/sounds/182.1.mp3";
import bgm182_2 from "../assets/sounds/182.2.mp3";
import { getNetworkHints, whenAudioAllowed } from "../assets/bandwidth-gate";
import { getVolumeScale } from "../settings";
import { devWarn } from "../util/dev-log";

export type BgmKey =
  "bgm038" | "bgm168" | "bgm161_1" | "bgm161_2" | "bgm182_1" | "bgm182_2";

/** Legacy absolute volume passed to play() — classic loudness at 100% slider. */
export const BGM_BASE_VOLUME = 0.3;

const BGM_URLS: Record<BgmKey, string> = {
  bgm038,
  bgm168,
  bgm161_1,
  bgm161_2,
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
    } catch (e) {
      devWarn("[audio] setLiveBgm volume failed", e);
    }
  }
};

/** Push current BGM slider onto the active track (and any cached aliases). */
export const applyBgmVolume = (): void => {
  const scale = getVolumeScale("bgm");
  try {
    if (liveBgm) liveBgm.volume = scale;
  } catch (e) {
    devWarn("[audio] applyBgmVolume live failed", e);
  }
  // Keep idle cached tracks in sync so the next play isn't stuck at an old gain.
  cache.forEach((s) => {
    try {
      s.volume = scale;
    } catch (e) {
      devWarn("[audio] applyBgmVolume cache failed", e);
    }
  });
};

/** Play move.mp3 at the current SFX slider (throttled by caller). */
export { playSfxPreview, playVoicePreview } from "./sfx";

export const unlockAudio = (): void => {
  try {
    const pixiSound = sound as typeof sound & {
      context?: {
        audioContext?: AudioContext;
        unlocked?: boolean;
      };
      unlock?: () => void;
    };
    try {
      pixiSound.unlock?.();
    } catch {
      /* ignore */
    }
    const ctx = pixiSound.context?.audioContext;
    if (ctx && ctx.state === "suspended") {
      void ctx.resume().catch(() => {
        /* gesture may still be required on some WebViews */
      });
    }
    if (ctx && typeof document !== "undefined") {
      const resume = () => {
        try {
          if (ctx.state === "suspended") void ctx.resume();
        } catch {
          /* ignore */
        }
      };
      document.addEventListener("visibilitychange", resume, { passive: true });
      window.addEventListener("focus", resume, { passive: true });
    }
  } catch {
    /* ignore */
  }
};

/** Menu intro/loop may load during visual-critical; play/over tracks wait. */
const isPlayOrOverKey = (key: BgmKey): boolean =>
  key !== "bgm161_1" && key !== "bgm161_2";

/**
 * Wait for an in-flight Sound to finish preloading without calling play()/load()
 * again. Re-entering load() on the same WebAudioMedia assigns buffer twice and
 * throws InvalidStateError from AudioBufferSourceNode.
 */
const waitUntilLoaded = (
  key: BgmKey,
  s: PIXI.sound.Sound,
): Promise<PIXI.sound.Sound | null> =>
  new Promise((resolve) => {
    if (s.isLoaded) {
      resolve(s);
      return;
    }
    const t0 = Date.now();
    const tick = () => {
      try {
        if (s.isLoaded) {
          resolve(s);
          return;
        }
      } catch {
        resolve(null);
        return;
      }
      if (Date.now() - t0 > 60_000) {
        devWarn(`Timed out waiting for BGM ${key}`);
        resolve(null);
        return;
      }
      setTimeout(tick, 32);
    };
    tick();
  });

const startLoad = (key: BgmKey): Promise<PIXI.sound.Sound | null> => {
  const hit = cache.get(key);
  if (hit?.isLoaded) return Promise.resolve(hit);
  const pending = inflight.get(key);
  if (pending) return pending;
  const promise = (async (): Promise<PIXI.sound.Sound | null> => {
    try {
      // Prefer an already-registered alias — even if still decoding.
      // Never sound.add() over a partial load: that orphans the first decode
      // and can still race the shared AudioContext path.
      if (sound.exists(key)) {
        const existing = sound.find(key);
        if (existing) {
          const ready = await waitUntilLoaded(key, existing);
          if (ready?.isLoaded) {
            cache.set(key, ready);
            return ready;
          }
          // Stale / broken alias — drop and re-add below.
          try {
            sound.remove(key);
          } catch {
            /* ignore */
          }
        }
      }
      const s = await new Promise<PIXI.sound.Sound | null>((resolve) => {
        let settled = false;
        const done = (value: PIXI.sound.Sound | null) => {
          if (settled) return;
          settled = true;
          resolve(value);
        };
        const added = sound.add(key, {
          url: BGM_URLS[key],
          preload: true,
          // singleInstance keeps pause/resume predictable for looping menu tracks.
          singleInstance: true,
          loaded: (err, loadedSound) => {
            if (err || !loadedSound) {
              devWarn(`Failed to load BGM ${key}:`, err);
              done(null);
              return;
            }
            done(loadedSound);
          },
        });
        // If the library already had it fully loaded, resolve sync-style.
        if (added.isLoaded) {
          done(added);
        }
      });
      if (s?.isLoaded) cache.set(key, s);
      return s;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
};

/**
 * Load one track. Play/over keys wait for whenAudioAllowed() so the first
 * piece texture can finish first on slow networks. Menu tracks are unrestricted.
 */
const loadOne = async (key: BgmKey): Promise<PIXI.sound.Sound | null> => {
  const hit = cache.get(key);
  if (hit?.isLoaded) return hit;
  if (isPlayOrOverKey(key)) {
    await whenAudioAllowed();
  }
  return startLoad(key);
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
 * already-loaded / in-flight keys are no-ops. Play keys respect the gate.
 */
export const prefetchBgm = (...keys: BgmKey[]): void => {
  for (const key of keys) void loadOne(key);
};

/** Prefetch the menu intro+loop so click-to-continue usually plays instantly. */
export const prefetchMenuBgm = (): void => {
  prefetchBgm("bgm161_1", "bgm161_2");
};

/**
 * Warm play/over tracks after visual-critical (gate inside loadOne).
 * On slow/save-data networks, only warm the two in-match tracks — not game-over.
 */
export const prefetchPlayBgm = (): void => {
  const hints = getNetworkHints();
  if (hints.verySlow) {
    // Only the rotation pool; game-over loads just-in-time.
    prefetchBgm("bgm038", "bgm168");
    return;
  }
  if (hints.slow) {
    prefetchBgm("bgm038", "bgm168");
    return;
  }
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
