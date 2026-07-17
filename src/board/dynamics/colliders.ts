/**
 * Pure collider geometry for truePhysics pieces.
 * Units: canvas pixels (1 Rapier unit = 1 px).
 */
import { BOX_SIZE } from "../../config";
import type { PieceKind } from "../../domain/types";

export type ColliderSpec = {
  /** Cuboid half-extents (width/2, height/2) in body-local space. */
  halfExtents: { x: number; y: number };
  /**
   * Collider center offset from body origin (= PIXI sprite position / anchor).
   * Rotates with the body.
   */
  offset: { x: number; y: number };
  /** Cell-equivalent mass used for scoring + Rapier density. */
  mass: number;
};

/** Cell-equivalent mass for scoring (matches grid path cell counts). */
export const massOfKind = (kind: PieceKind): number => {
  switch (kind) {
    case "cell2":
      return 2;
    case "big2x2":
      return 4;
    case "item":
    case "shrunk":
      return 1;
    default:
      return 1;
  }
};

/**
 * Shape specs so body translation == sprite.x/y and body rotation == sprite.rotation.
 *
 * cell2: PIXI anchor (0.5, 0.25) on a 1×2 texture → geometric center is
 *        0.5·BOX below the anchor when unrotated.
 * big2x2 / item / shrunk: anchor is geometric center.
 */
export const colliderSpecFor = (
  kind: PieceKind,
  boxSize: number = BOX_SIZE,
): ColliderSpec => {
  const mass = massOfKind(kind);
  switch (kind) {
    case "cell2":
      return {
        halfExtents: { x: boxSize / 2, y: boxSize },
        offset: { x: 0, y: boxSize / 2 },
        mass,
      };
    case "big2x2":
      return {
        halfExtents: { x: boxSize, y: boxSize },
        offset: { x: 0, y: 0 },
        mass,
      };
    case "item":
    case "shrunk":
    default:
      return {
        halfExtents: { x: boxSize / 2, y: boxSize / 2 },
        offset: { x: 0, y: 0 },
        mass,
      };
  }
};

/** Density so cuboid mass ≈ target (area = 4 · hx · hy). */
export const densityForMass = (
  mass: number,
  halfExtents: { x: number; y: number },
): number => {
  const area = 4 * halfExtents.x * halfExtents.y;
  if (area <= 0) return 1;
  return mass / area;
};
