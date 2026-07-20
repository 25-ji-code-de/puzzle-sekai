/**
 * Axis-aligned bounds helpers for continuous-space pieces.
 * Body translation == sprite.x/y; body rotation == sprite.rotation.
 */
import type { PieceKind } from "../../domain/types";
import { colliderSpecFor } from "./colliders";
import type { LocalPoint } from "./alpha-shape";
import { nonNegative } from "../../util/clamp";

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
  const dx = nonNegative(Math.max(a.minX - b.maxX, b.minX - a.maxX));
  const dy = nonNegative(Math.max(a.minY - b.maxY, b.minY - a.maxY));
  return Math.hypot(dx, dy);
};
