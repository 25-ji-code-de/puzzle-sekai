/**
 * Sprite rotation ↔ Orientation (single implementation).
 * Convention: spawn often at π; active controllers use this for facing.
 */
import { asOrientation, type Orientation } from "./cell";

/**
 * Normalize sprite.rotation (radians) into 0–3 orientation slots.
 * Formula matches historical: (rotation/π * 2 + 2) % 4
 */
export const rotationToOrientation = (rotation: number): Orientation =>
  asOrientation((Math.fround(rotation / Math.PI) * 2 + 2) % 4);

/**
 * Target rotation (radians) for a logical orientation when spawn base is π.
 * orient 0 → π, 1 → π + π/2, …
 */
export const orientationToRotation = (
  orient: Orientation,
  spawnBase: number = Math.PI,
): number => spawnBase + (orient * Math.PI) / 2;
