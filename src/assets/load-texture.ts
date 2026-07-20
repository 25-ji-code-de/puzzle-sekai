/**
 * Shared texture ensure for pieces / items / play pack.
 *
 * Play textures intentionally do **not** reuse `app.loader.load()` after the
 * boot shell batch: resource-loader keeps the queue resumed and only allows
 * one named add, so a second load cycle is fragile. Instead we load via
 * Image → BaseTexture, then register into TextureCache + `app.loader.resources`
 * so legacy `resources[url].texture` readers still work.
 *
 * Spawn/preview uses fetchPriority "high"; background pack warm uses "low".
 */
import * as PIXI from "pixi.js-legacy";
import { app } from "../runtime";
import { getNetworkHints } from "./bandwidth-gate";
import { clamp } from "../util/clamp";

/** URL string, or named entry (`resources[name]` ← url). */
export type LoaderEntry = string | { name: string; url: string };

export type TexturePriority = "high" | "low" | "auto";

const entryKey = (e: LoaderEntry): string =>
  typeof e === "string" ? e : e.name;

const entryUrl = (e: LoaderEntry): string =>
  typeof e === "string" ? e : e.url;

const isValidTexture = (
  tex: PIXI.Texture | undefined | null,
): tex is PIXI.Texture =>
  Boolean(tex && tex.baseTexture && tex.baseTexture.valid);

/** Prefer loader resource, then PIXI TextureCache. */
export const peekTexture = (key: string): PIXI.Texture | undefined => {
  const fromLoader = app.loader.resources[key]?.texture;
  if (isValidTexture(fromLoader)) return fromLoader;
  const fromCache = PIXI.utils.TextureCache[key] as PIXI.Texture | undefined;
  if (isValidTexture(fromCache)) return fromCache;
  return undefined;
};

/** Publish texture for both TextureCache and legacy loader.resources readers. */
const registerTexture = (key: string, texture: PIXI.Texture): void => {
  if (!key) return;
  try {
    if (!PIXI.utils.TextureCache[key]) {
      PIXI.Texture.addToCache(texture, key);
    }
  } catch {
    /* ignore */
  }
  const res = app.loader.resources[key] as
    { texture?: PIXI.Texture; url?: string; name?: string } | undefined;
  if (res) {
    if (!res.texture) res.texture = texture;
  } else {
    // Minimal stub — only `.texture` is read by gameplay call sites.
    (
      app.loader.resources as Record<
        string,
        { texture: PIXI.Texture; url: string; name: string }
      >
    )[key] = {
      name: key,
      url: key,
      texture,
    };
  }
};

const inflight = new Map<string, Promise<PIXI.Texture>>();

const applyFetchPriority = (
  img: HTMLImageElement,
  priority: TexturePriority,
): void => {
  try {
    // fetchPriority is widely supported in Chromium; other engines ignore.
    (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority =
      priority;
  } catch {
    /* ignore */
  }
};

const loadOneImage = (
  key: string,
  url: string,
  priority: TexturePriority = "auto",
): Promise<PIXI.Texture> => {
  const hit = peekTexture(key);
  if (hit) return Promise.resolve(hit);

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = new Promise<PIXI.Texture>((resolve, reject) => {
    const existing = PIXI.utils.TextureCache[url] as PIXI.Texture | undefined;
    if (isValidTexture(existing)) {
      registerTexture(key, existing);
      if (key !== url) registerTexture(url, existing);
      resolve(existing);
      return;
    }

    const img = new Image();
    // Vite-served same-origin assets; keep CORS friendly for canvas taint safety.
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    applyFetchPriority(img, priority);

    const settleOk = () => {
      try {
        const base = new PIXI.BaseTexture(img);
        const texture = new PIXI.Texture(base);
        registerTexture(key, texture);
        if (key !== url) registerTexture(url, texture);
        resolve(texture);
      } catch (err) {
        reject(err);
      }
    };

    const settleErr = () => {
      reject(new Error(`Failed to load texture: ${url}`));
    };

    img.onload = settleOk;
    img.onerror = settleErr;
    img.src = url;

    // Cached by browser — may already be complete synchronously.
    if (img.complete && img.naturalWidth > 0) {
      img.onload = null;
      img.onerror = null;
      settleOk();
    }
  }).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
};

/** Cap parallel image fetches so the first-needed piece isn't bandwidth-starved. */
const mapPool = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    },
  );
  await Promise.all(workers);
  return results;
};

const defaultWarmConcurrency = (): number => {
  const hints = getNetworkHints();
  if (hints.verySlow) return 2;
  if (hints.slow) return 3;
  return 4;
};

/**
 * Ensure every entry has a valid texture. Concurrent-safe.
 * Background warm path — uses low fetchPriority.
 * `onProgress` reports 0–100 by completed count (not byte size).
 */
export const ensureTextures = async (
  entries: LoaderEntry[],
  onProgress?: (pct: number) => void,
  concurrency?: number,
): Promise<void> => {
  const unique = new Map<string, LoaderEntry>();
  for (const e of entries) {
    const key = entryKey(e);
    if (!key) continue;
    unique.set(key, e);
  }
  const list = [...unique.values()];
  if (list.length === 0) {
    onProgress?.(100);
    return;
  }

  let done = 0;
  const total = list.length;
  const report = () => {
    onProgress?.(clamp(Math.round((done / total) * 100), 0, 100));
  };

  const limit = concurrency ?? defaultWarmConcurrency();
  await mapPool(list, limit, async (e) => {
    const key = entryKey(e);
    const url = entryUrl(e);
    try {
      if (!peekTexture(key)) {
        await loadOneImage(key, url, "low");
      }
    } finally {
      done += 1;
      report();
    }
  });
  onProgress?.(100);
};

/**
 * Cache-first single texture for gameplay (spawn / preview).
 * High fetchPriority so browsers prefer it over low-priority pack warm.
 */
export const loadTexture = async (file: string): Promise<PIXI.Texture> => {
  const hit = peekTexture(file);
  if (hit) return hit;
  return loadOneImage(file, file, "high");
};
