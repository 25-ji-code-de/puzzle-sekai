/**
 * Shape queries for continuous active-piece control.
 * Prefer intersection tests at candidate poses (kinematic snap moves).
 * Uses texture-alpha hull AABBs when available, else PieceKind cuboid.
 */
import type * as PIXI from "pixi.js-legacy";
import {
  BOARD_ORIGIN_X,
  BOX_SIZE,
  LEFT_BORDER,
  OFFSET_BOTTOM,
  RIGHT_BORDER,
  STAGE_HEIGHT,
} from "../../config";
import type { PieceKind } from "../../domain/types";
import type { LocalPoint } from "./alpha-shape";
import { buildAlphaShape } from "./alpha-shape";
import { colliderSpecFor } from "./colliders";
import { resolveComOffset, type ComOffset } from "./com-table";
import { poseAabb } from "./pose";
import { allSettledBodies, getActiveBody, localPointsForSprite } from "./world";

const playLeft = () => BOARD_ORIGIN_X;
const playRight = () => BOARD_ORIGIN_X + (RIGHT_BORDER - LEFT_BORDER);
const playBottom = () => STAGE_HEIGHT - OFFSET_BOTTOM;

/**
 * Sub-pixel slop: flush contact with wall/floor is allowed.
 * (Previous WALL_PAD=+1 blocked column 0/5 centers where AABB equals the wall.)
 */
const BOUND_EPS = 0.5;
/** Soft overlap margin between piece AABBs so near-touch still moves. */
const BODY_EPS = 1;

/**
 * Separating Axis Test (SAT) between two convex polygons in world space.
 * Both must be convex, wound consistently (CCW), and have >= 3 vertices.
 * Returns false as soon as a separating axis is found, true if none found.
 */
export const hullsIntersect = (
  a: LocalPoint[],
  poseA: { x: number; y: number; rotation: number },
  b: LocalPoint[],
  poseB: { x: number; y: number; rotation: number },
): boolean => {
  const nA = a.length;
  const nB = b.length;

  // Transform polygon A to world space
  const ca = Math.cos(poseA.rotation);
  const sa = Math.sin(poseA.rotation);
  const wA: [number, number][] = [];
  for (let i = 0; i < nA; i++) {
    wA.push([
      poseA.x + a[i].x * ca - a[i].y * sa,
      poseA.y + a[i].x * sa + a[i].y * ca,
    ]);
  }

  // Transform polygon B to world space
  const cb = Math.cos(poseB.rotation);
  const sb = Math.sin(poseB.rotation);
  const wB: [number, number][] = [];
  for (let i = 0; i < nB; i++) {
    wB.push([
      poseB.x + b[i].x * cb - b[i].y * sb,
      poseB.y + b[i].x * sb + b[i].y * cb,
    ]);
  }

  // Test axes from polygon A edges
  for (let i = 0; i < nA; i++) {
    const j = (i + 1) % nA;
    const nx = -(wA[j][1] - wA[i][1]); // perpendicular (edge normal)
    const ny = wA[j][0] - wA[i][0];
    const len = Math.hypot(nx, ny);
    if (len < 1e-10) continue;
    const ax = nx / len;
    const ay = ny / len;

    let minA = Infinity, maxA = -Infinity;
    for (const [wx, wy] of wA) {
      const d = wx * ax + wy * ay;
      if (d < minA) minA = d;
      if (d > maxA) maxA = d;
    }
    let minB = Infinity, maxB = -Infinity;
    for (const [wx, wy] of wB) {
      const d = wx * ax + wy * ay;
      if (d < minB) minB = d;
      if (d > maxB) maxB = d;
    }
    if (maxA <= minB || maxB <= minA) return false; // separating axis found
  }

  // Test axes from polygon B edges
  for (let i = 0; i < nB; i++) {
    const j = (i + 1) % nB;
    const nx = -(wB[j][1] - wB[i][1]);
    const ny = wB[j][0] - wB[i][0];
    const len = Math.hypot(nx, ny);
    if (len < 1e-10) continue;
    const ax = nx / len;
    const ay = ny / len;

    let minA = Infinity, maxA = -Infinity;
    for (const [wx, wy] of wA) {
      const d = wx * ax + wy * ay;
      if (d < minA) minA = d;
      if (d > maxA) maxA = d;
    }
    let minB = Infinity, maxB = -Infinity;
    for (const [wx, wy] of wB) {
      const d = wx * ax + wy * ay;
      if (d < minB) minB = d;
      if (d > maxB) maxB = d;
    }
    if (maxA <= minB || maxB <= minA) return false;
  }

  return true; // no separating axis → intersection
};

/**
 * Check if a convex hull at (x, y, rotation) is within playfield boundaries.
 * More accurate than AABB boundary check: rejects only when hull actually crosses the wall.
 */
const hullInBounds = (
  localPoints: LocalPoint[],
  x: number,
  y: number,
  rotation: number,
): boolean => {
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  for (const p of localPoints) {
    const wx = x + p.x * c - p.y * s;
    const wy = y + p.x * s + p.y * c;
    if (wx < playLeft() - BOUND_EPS) return false;
    if (wx > playRight() + BOUND_EPS) return false;
    if (wy > playBottom() + BOUND_EPS) return false;
  }
  return true;
};

const pointsFor = (
  kind: PieceKind,
  sprite: PIXI.Sprite | undefined,
  x: number,
  y: number,
  rotation: number,
): LocalPoint[] | undefined => {
  if (sprite) {
    const live = localPointsForSprite(sprite);
    if (live?.length) return live;
    // Extract on the fly (and cache) if body was created before image decode
    const shape = buildAlphaShape(sprite);
    if (shape?.points?.length) {
      const entry = getActiveBody(sprite);
      if (entry) entry.localPoints = shape.points;
      return shape.points;
    }
  }
  void kind;
  void x;
  void y;
  void rotation;
  return undefined;
};

const comFor = (
  kind: PieceKind,
  sprite: PIXI.Sprite | undefined,
): ComOffset => {
  if (sprite) {
    const entry = getActiveBody(sprite);
    if (entry?.com) return entry.com;
    for (const e of allSettledBodies()) {
      if (e.sprite === sprite && e.com) return e.com;
    }
  }
  return resolveComOffset({ kind });
};

/** Geometric / mass center in world space (prefers hardcoded COM). */
export const geometricCenter = (
  kind: PieceKind,
  x: number,
  y: number,
  rotation: number,
  localPoints?: LocalPoint[] | null,
  com?: ComOffset | null,
  sprite?: PIXI.Sprite,
): { x: number; y: number } => {
  const cLocal =
    com ?? (sprite ? comFor(kind, sprite) : null) ?? resolveComOffset({ kind });
  // Prefer hardcoded COM for rotation pivot (matches physics mass props)
  if (cLocal) {
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    return {
      x: x + cLocal.x * c - cLocal.y * s,
      y: y + cLocal.x * s + cLocal.y * c,
    };
  }
  if (localPoints && localPoints.length >= 3) {
    let cx = 0;
    let cy = 0;
    for (const p of localPoints) {
      cx += p.x;
      cy += p.y;
    }
    cx /= localPoints.length;
    cy /= localPoints.length;
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    return {
      x: x + cx * c - cy * s,
      y: y + cx * s + cy * c,
    };
  }
  const { offset } = colliderSpecFor(kind);
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  return {
    x: x + offset.x * c - offset.y * s,
    y: y + offset.x * s + offset.y * c,
  };
};

/**
 * Body origin (sprite.x/y) so that the geometric/mass center stays at `center`
 * after `rotation`.
 */
export const originFromCenter = (
  kind: PieceKind,
  centerX: number,
  centerY: number,
  rotation: number,
  localPoints?: LocalPoint[] | null,
  com?: ComOffset | null,
  sprite?: PIXI.Sprite,
): { x: number; y: number } => {
  const cLocal =
    com ?? (sprite ? comFor(kind, sprite) : null) ?? resolveComOffset({ kind });
  if (cLocal) {
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    return {
      x: centerX - (cLocal.x * c - cLocal.y * s),
      y: centerY - (cLocal.x * s + cLocal.y * c),
    };
  }
  if (localPoints && localPoints.length >= 3) {
    let cx = 0;
    let cy = 0;
    for (const p of localPoints) {
      cx += p.x;
      cy += p.y;
    }
    cx /= localPoints.length;
    cy /= localPoints.length;
    const c = Math.cos(rotation);
    const s = Math.sin(rotation);
    return {
      x: centerX - (cx * c - cy * s),
      y: centerY - (cx * s + cy * c),
    };
  }
  const { offset } = colliderSpecFor(kind);
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  return {
    x: centerX - (offset.x * c - offset.y * s),
    y: centerY - (offset.x * s + offset.y * c),
  };
};

/** Snap rotation to nearest k·π/2 (keeps control discrete). */
export const snapQuarterTurn = (rotation: number): number => {
  const q = Math.PI / 2;
  return Math.round(rotation / q) * q;
};

/**
 * Conservative penetration test using convex hulls when available, AABBs as fallback.
 * Uses SAT (Separating Axis Theorem) for hull-hull intersection when both sides have hull data.
 */
export const poseIntersectsSolids = (
  kind: PieceKind,
  x: number,
  y: number,
  rotation: number,
  /** Sprite of the active piece (excluded from settled set). */
  self?: PIXI.Sprite,
): boolean => {
  const pts = pointsFor(kind, self, x, y, rotation);

  // Boundary check: use hull-aware check when available, else AABB
  if (pts && pts.length >= 3) {
    if (!hullInBounds(pts, x, y, rotation)) return true;
  } else {
    const aabb = poseAabb(kind, { x, y, rotation }, pts);
    if (aabb.minX < playLeft() - BOUND_EPS) return true;
    if (aabb.maxX > playRight() + BOUND_EPS) return true;
    if (aabb.maxY > playBottom() + BOUND_EPS) return true;
  }

  // Body collision: use hull-hull SAT when both sides have hull data, else AABB fallback
  for (const entry of allSettledBodies()) {
    if (self && entry.sprite === self) continue;
    const t = entry.body.translation();
    const r = entry.body.rotation();
    const otherPts = entry.localPoints;

    if (pts && pts.length >= 3 && otherPts && otherPts.length >= 3) {
      // Hull-hull SAT
      if (hullsIntersect(
        pts,
        { x, y, rotation },
        otherPts,
        { x: t.x, y: t.y, rotation: r },
      )) {
        return true;
      }
    } else {
      // AABB fallback (one or both sides lack hull data)
      const aabbSelf = poseAabb(kind, { x, y, rotation }, pts);
      const aabbOther = poseAabb(entry.kind, { x: t.x, y: t.y, rotation: r }, otherPts);
      if (
        aabbSelf.minX < aabbOther.maxX - BODY_EPS &&
        aabbSelf.maxX > aabbOther.minX + BODY_EPS &&
        aabbSelf.minY < aabbOther.maxY - BODY_EPS &&
        aabbSelf.maxY > aabbOther.minY + BODY_EPS
      ) {
        return true;
      }
    }
  }
  return false;
};

/** Lowest y the piece can sit without intersecting (scan downward). */
export const castDownY = (
  kind: PieceKind,
  x: number,
  startY: number,
  rotation: number,
  self?: PIXI.Sprite,
): number => {
  const pts = pointsFor(kind, self, x, startY, rotation);
  const aabb0 = poseAabb(kind, { x, y: startY, rotation }, pts);
  // Max: shift so current AABB bottom lands on the floor
  const floorY = playBottom();
  const depthBelowOrigin = aabb0.maxY - startY;
  let lo = startY;
  let hi = floorY - depthBelowOrigin;

  if (hi < lo) {
    // Already past floor estimate — clamp
    hi = lo;
  }

  if (poseIntersectsSolids(kind, x, startY, rotation, self)) {
    return startY;
  }
  if (!poseIntersectsSolids(kind, x, hi, rotation, self)) {
    return hi;
  }
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (poseIntersectsSolids(kind, x, mid, rotation, self)) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return lo;
};

export const canPlaceAt = (
  kind: PieceKind,
  x: number,
  y: number,
  rotation: number,
  self?: PIXI.Sprite,
): boolean => !poseIntersectsSolids(kind, x, y, rotation, self);

/** Try horizontal shift by dx px; returns accepted x. */
export const tryShiftX = (
  kind: PieceKind,
  x: number,
  y: number,
  rotation: number,
  dx: number,
  self?: PIXI.Sprite,
): number | null => {
  const nx = x + dx;
  if (canPlaceAt(kind, nx, y, rotation, self)) return nx;
  return null;
};

/**
 * Maximum horizontal move in `direction` up to `maxDist` without intersection.
 * Prefer a full-step when free; otherwise binary-search the flush limit
 * (so edge columns / wide alpha hulls can still slide to the wall).
 * Returns signed delta (0 if nowhere to go).
 */
export const maxShiftX = (
  kind: PieceKind,
  x: number,
  y: number,
  rotation: number,
  direction: -1 | 1,
  maxDist: number = BOX_SIZE,
  self?: PIXI.Sprite,
): number => {
  if (maxDist <= 0) return 0;
  const full = direction * maxDist;
  if (canPlaceAt(kind, x + full, y, rotation, self)) return full;

  // Binary search free distance along the axis
  let lo = 0;
  let hi = maxDist;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (canPlaceAt(kind, x + direction * mid, y, rotation, self)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  // Ignore sub-pixel jitter so a blocked move stays blocked
  if (lo < 0.5) return 0;
  return direction * lo;
};

/**
 * Apply a left/right control step: full cell if possible, else residual to wall/body.
 * Returns the new x, or null if no movement.
 */
export const stepShiftX = (
  kind: PieceKind,
  x: number,
  y: number,
  rotation: number,
  direction: -1 | 1,
  step: number = BOX_SIZE,
  self?: PIXI.Sprite,
): number | null => {
  const dx = maxShiftX(kind, x, y, rotation, direction, step, self);
  if (dx === 0) return null;
  return x + dx;
};

/**
 * Wall kicks measured from the post-rotation center-preserving origin.
 * Prefer 0, then half-cell, then full cell (grid-like).
 */
const KICKS = [0, -BOX_SIZE / 2, BOX_SIZE / 2, -BOX_SIZE, BOX_SIZE];

/**
 * Try rotate ±90° around the piece's geometric center (not the PIXI anchor),
 * so cell2 doesn't swing around its top cell. Then apply wall kicks.
 */
export const tryRotate = (
  kind: PieceKind,
  x: number,
  y: number,
  rotation: number,
  dir: 1 | -1,
  self?: PIXI.Sprite,
): { x: number; y: number; rotation: number } | null => {
  const pts = pointsFor(kind, self, x, y, rotation);
  const com = comFor(kind, self);
  const rot0 = snapQuarterTurn(rotation);
  const nextRot = snapQuarterTurn(rot0 + (dir * Math.PI) / 2);
  const center = geometricCenter(kind, x, y, rot0, pts, com, self);
  const origin = originFromCenter(
    kind,
    center.x,
    center.y,
    nextRot,
    pts,
    com,
    self,
  );

  for (const kick of KICKS) {
    const nx = origin.x + kick;
    const ny = origin.y;
    if (canPlaceAt(kind, nx, ny, nextRot, self)) {
      return { x: nx, y: ny, rotation: nextRot };
    }
  }
  // Extra vertical kicks near floor / rubble (small lifts)
  for (const vy of [-BOX_SIZE / 2, BOX_SIZE / 2]) {
    const nx = origin.x;
    const ny = origin.y + vy;
    if (canPlaceAt(kind, nx, ny, nextRot, self)) {
      return { x: nx, y: ny, rotation: nextRot };
    }
  }
  return null;
};
