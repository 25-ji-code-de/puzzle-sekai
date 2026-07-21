/**
 * Geometry helpers for continuous-space pieces (AABB + convex hull SAT).
 * Body translation == sprite.x/y; body rotation == sprite.rotation.
 */
import type { PieceKind } from "../../domain/types";
import { colliderSpecFor } from "./colliders";
import type { LocalPoint } from "./alpha-shape";

export type Pose = { x: number; y: number; rotation: number };

/** World-space AABB from body-local polygon points. */
export const poseAabbFromPoints = (
  points: LocalPoint[],
  pose: Pose,
): { minX: number; minY: number; maxX: number; maxY: number } => {
  const c = Math.cos(pose.rotation);
  const s = Math.sin(pose.rotation);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    const wx = pose.x + p.x * c - p.y * s;
    const wy = pose.y + p.x * s + p.y * c;
    if (wx < minX) minX = wx;
    if (wy < minY) minY = wy;
    if (wx > maxX) maxX = wx;
    if (wy > maxY) maxY = wy;
  }
  return { minX, minY, maxX, maxY };
};

/** Transform body-local hull verts into world space. */
const worldHull = (points: LocalPoint[], pose: Pose): [number, number][] => {
  const c = Math.cos(pose.rotation);
  const s = Math.sin(pose.rotation);
  const out: [number, number][] = [];
  for (const p of points) {
    out.push([pose.x + p.x * c - p.y * s, pose.y + p.x * s + p.y * c]);
  }
  return out;
};

/**
 * Separating Axis Test between two convex polygons in world space.
 * Polygons must be convex, consistently wound, and have ≥ 3 vertices.
 * Flush edge contact (maxA === minB) is not an intersection.
 */
export const hullsIntersect = (
  a: LocalPoint[],
  poseA: Pose,
  b: LocalPoint[],
  poseB: Pose,
): boolean => {
  const wA = worldHull(a, poseA);
  const wB = worldHull(b, poseB);
  const nA = wA.length;
  const nB = wB.length;

  const axisSeparates = (nx: number, ny: number): boolean => {
    const len = Math.hypot(nx, ny);
    if (len < 1e-10) return false;
    const ax = nx / len;
    const ay = ny / len;
    let minA = Infinity;
    let maxA = -Infinity;
    for (const [wx, wy] of wA) {
      const d = wx * ax + wy * ay;
      if (d < minA) minA = d;
      if (d > maxA) maxA = d;
    }
    let minB = Infinity;
    let maxB = -Infinity;
    for (const [wx, wy] of wB) {
      const d = wx * ax + wy * ay;
      if (d < minB) minB = d;
      if (d > maxB) maxB = d;
    }
    return maxA <= minB || maxB <= minA;
  };

  for (let i = 0; i < nA; i++) {
    const j = (i + 1) % nA;
    // Edge normal (perpendicular)
    if (axisSeparates(-(wA[j][1] - wA[i][1]), wA[j][0] - wA[i][0])) {
      return false;
    }
  }
  for (let i = 0; i < nB; i++) {
    const j = (i + 1) % nB;
    if (axisSeparates(-(wB[j][1] - wB[i][1]), wB[j][0] - wB[i][0])) {
      return false;
    }
  }
  return true;
};

/**
 * True when every hull vertex lies inside the half-open playfield box
 * [minX − eps, maxX + eps] × (−∞, maxY + eps] (no top bound).
 */
export const hullWithinBounds = (
  localPoints: LocalPoint[],
  pose: Pose,
  bounds: { minX: number; maxX: number; maxY: number },
  eps = 0,
): boolean => {
  const c = Math.cos(pose.rotation);
  const s = Math.sin(pose.rotation);
  for (const p of localPoints) {
    const wx = pose.x + p.x * c - p.y * s;
    const wy = pose.y + p.x * s + p.y * c;
    if (wx < bounds.minX - eps) return false;
    if (wx > bounds.maxX + eps) return false;
    if (wy > bounds.maxY + eps) return false;
  }
  return true;
};

/** World-space AABB of a piece collider (cuboid fallback or hull). */
export const poseAabb = (
  kind: PieceKind,
  pose: Pose,
  localPoints?: LocalPoint[] | null,
): { minX: number; minY: number; maxX: number; maxY: number } => {
  if (localPoints && localPoints.length >= 3) {
    return poseAabbFromPoints(localPoints, pose);
  }
  const spec = colliderSpecFor(kind);
  const c = Math.cos(pose.rotation);
  const s = Math.sin(pose.rotation);
  // Corners of the local cuboid around local center = offset
  const hx = spec.halfExtents.x;
  const hy = spec.halfExtents.y;
  const ox = spec.offset.x;
  const oy = spec.offset.y;
  const corners: [number, number][] = [
    [ox - hx, oy - hy],
    [ox + hx, oy - hy],
    [ox - hx, oy + hy],
    [ox + hx, oy + hy],
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [lx, ly] of corners) {
    const wx = pose.x + lx * c - ly * s;
    const wy = pose.y + lx * s + ly * c;
    if (wx < minX) minX = wx;
    if (wy < minY) minY = wy;
    if (wx > maxX) maxX = wx;
    if (wy > maxY) maxY = wy;
  }
  return { minX, minY, maxX, maxY };
};

/** Minimum distance between two AABBs (0 if overlapping). */
export const aabbGap = (
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number },
): number => {
  const dx = Math.max(0, Math.max(a.minX - b.maxX, b.minX - a.maxX));
  const dy = Math.max(0, Math.max(a.minY - b.maxY, b.minY - a.maxY));
  return Math.hypot(dx, dy);
};
