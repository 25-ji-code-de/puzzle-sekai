/**
 * Build body-local collision polygons from sprite texture alpha.
 * Opaque pixels → convex hull in space where (0,0) = sprite anchor / body origin.
 */
import type * as PIXI from "pixi.js-legacy";
import { atLeastOne, unitInterval } from "../../util/clamp";
import { maxOf } from "../../util/minmax";
import { devWarn } from "../../util/dev-log";

export type LocalPoint = { x: number; y: number };

export type AlphaShape = {
  /** Convex hull vertices in body-local space (anchor origin). */
  points: LocalPoint[];
  /** Axis-aligned half-extents of the hull (for mass density fallback). */
  halfExtents: { x: number; y: number };
  /** Hull centroid in local space (unused by body; collider verts are absolute local). */
  center: { x: number; y: number };
};

const ALPHA_THRESHOLD = 24;
/** Max sample resolution on the longer side (keeps hull cheap). */
const MAX_SAMPLE = 48;
const cache = new Map<string, AlphaShape | null>();

const cacheKey = (sprite: PIXI.Sprite): string => {
  const tex = sprite.texture;
  const base = tex?.baseTexture as unknown as
    | {
        imageUrl?: string;
        uid?: number;
        resource?: { url?: string };
      }
    | undefined;
  const src =
    base?.imageUrl ??
    base?.resource?.url ??
    (base?.uid != null ? String(base.uid) : "tex");
  const frame = tex.frame;
  return [
    src,
    frame?.x ?? 0,
    frame?.y ?? 0,
    frame?.width ?? 0,
    frame?.height ?? 0,
    sprite.anchor.x,
    sprite.anchor.y,
    Math.round(sprite.width),
    Math.round(sprite.height),
    ALPHA_THRESHOLD,
  ].join("|");
};

/** Monotone-chain convex hull. Input may be unsorted. */
export const convexHull = (pts: LocalPoint[]): LocalPoint[] => {
  if (pts.length <= 1) return pts.slice();
  const sorted = pts
    .slice()
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  // Unique
  const uniq: LocalPoint[] = [];
  for (const p of sorted) {
    const last = uniq[uniq.length - 1];
    if (last && last.x === p.x && last.y === p.y) continue;
    uniq.push(p);
  }
  if (uniq.length <= 2) return uniq;

  const cross = (o: LocalPoint, a: LocalPoint, b: LocalPoint) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: LocalPoint[] = [];
  for (const p of uniq) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: LocalPoint[] = [];
  for (let i = uniq.length - 1; i >= 0; i--) {
    const p = uniq[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
};

const getImageSource = (sprite: PIXI.Sprite): CanvasImageSource | null => {
  const base = sprite.texture?.baseTexture as
    | {
        resource?: { source?: CanvasImageSource };
        source?: CanvasImageSource;
      }
    | undefined;
  const src = base?.resource?.source ?? base?.source ?? null;
  if (!src) return null;
  // HTMLImageElement / HTMLCanvasElement / ImageBitmap
  if (
    typeof HTMLImageElement !== "undefined" &&
    src instanceof HTMLImageElement &&
    !src.complete
  ) {
    return null;
  }
  return src;
};

/**
 * Sample opaque texels of the sprite's texture frame, map into body-local
 * coordinates (anchor = origin, y-down like PIXI).
 */
export const buildAlphaShape = (sprite: PIXI.Sprite): AlphaShape | null => {
  const key = cacheKey(sprite);
  if (cache.has(key)) return cache.get(key) ?? null;

  const tex = sprite.texture;
  if (!tex || !tex.frame) {
    cache.set(key, null);
    return null;
  }
  const source = getImageSource(sprite);
  if (!source) {
    // Don't cache null on missing source — texture may still be decoding
    return null;
  }

  const frame = tex.frame;
  const fw = atLeastOne(Math.floor(frame.width));
  const fh = atLeastOne(Math.floor(frame.height));
  const scale = unitInterval(MAX_SAMPLE / maxOf([fw, fh], 1));
  const sw = atLeastOne(Math.floor(fw * scale));
  const sh = atLeastOne(Math.floor(fh * scale));

  let canvas: HTMLCanvasElement;
  try {
    canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      cache.set(key, null);
      return null;
    }
    ctx.clearRect(0, 0, sw, sh);
    // Draw only the texture frame region scaled into sw×sh
    ctx.drawImage(
      source,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      0,
      0,
      sw,
      sh,
    );
    const data = ctx.getImageData(0, 0, sw, sh).data;
    const opaque: LocalPoint[] = [];
    // sprite.width/height are display sizes in world px
    const dispW = sprite.width || fw;
    const dispH = sprite.height || fh;
    const ax = sprite.anchor?.x ?? 0.5;
    const ay = sprite.anchor?.y ?? 0.5;

    for (let sy = 0; sy < sh; sy++) {
      for (let sx = 0; sx < sw; sx++) {
        const a = data[(sy * sw + sx) * 4 + 3];
        if (a < ALPHA_THRESHOLD) continue;
        // texels → display px relative to top-left, then subtract anchor
        const lx = (sx / sw) * dispW - ax * dispW;
        const ly = (sy / sh) * dispH - ay * dispH;
        opaque.push({ x: lx, y: ly });
      }
    }

    if (opaque.length < 3) {
      cache.set(key, null);
      return null;
    }

    const hull = convexHull(opaque);
    if (hull.length < 3) {
      cache.set(key, null);
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let cx = 0;
    let cy = 0;
    for (const p of hull) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
      cx += p.x;
      cy += p.y;
    }
    cx /= hull.length;
    cy /= hull.length;

    const shape: AlphaShape = {
      points: hull,
      halfExtents: {
        x: atLeastOne((maxX - minX) / 2),
        y: atLeastOne((maxY - minY) / 2),
      },
      center: { x: cx, y: cy },
    };
    cache.set(key, shape);
    return shape;
  } catch (e) {
    devWarn("[truePhysics] alpha shape extract failed", e);
    cache.set(key, null);
    return null;
  }
};

/** Flatten hull to Rapier convexHull Float32Array [x0,y0,x1,y1,...]. */
export const hullToFloat32 = (points: LocalPoint[]): Float32Array => {
  const out = new Float32Array(points.length * 2);
  for (let i = 0; i < points.length; i++) {
    out[i * 2] = points[i].x;
    out[i * 2 + 1] = points[i].y;
  }
  return out;
};

export const clearAlphaShapeCache = (): void => {
  cache.clear();
};
