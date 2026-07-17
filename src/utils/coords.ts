import { STAGE_HEIGHT } from "../config";
import { pieces } from "../game/board-state";
import {
  asOrientation,
  stackHeightForPrimary,
  willCollidePrimary,
  primaryFromSprite,
  cellCenterX,
  cellCenterY,
} from "../board/geometry";

export const getCoordinates = (
  sprite: PIXI.Sprite,
  method: "floor" | "ceil" | "round" = "ceil",
): { x: number; y: number } =>
  primaryFromSprite(sprite, "cell2", method);

export const moveToCoordinate = (
  sprite: PIXI.Sprite,
  x: number,
  y: number,
  stageHeight: number = STAGE_HEIGHT,
): void => {
  sprite.x = cellCenterX(x);
  sprite.y = cellCenterY(y, stageHeight);
};

/** Normalize sprite rotation into 0–3 orientation slots. */
export const rotationToOrientation = (rotation: number): number =>
  (Math.fround(rotation / Math.PI) * 2 + 2) % 4;

/**
 * Collision for an active standard piece at primary (x,y) with the given
 * rotation. Uses geometry footprint — same cells as land / updateCoordinates.
 */
export const willCollide = (
  x: number,
  y: number,
  rotation: number,
): boolean => {
  if (x === undefined || y === undefined || Number.isNaN(x) || Number.isNaN(y)) {
    return true;
  }
  const orient = asOrientation(rotationToOrientation(rotation));
  return willCollidePrimary(pieces, { x, y }, orient, "cell2");
};

export const getOffset = (sprite: PIXI.Sprite) =>
  rotationToOrientation(sprite.rotation);

/**
 * Stack height under an active standard piece / item (floor-primary coords).
 */
export const getStackHeight = (sprite: PIXI.Sprite) => {
  const { x, y } = getCoordinates(sprite, "floor");
  const orient = asOrientation(getOffset(sprite));
  return stackHeightForPrimary(pieces, { x, y }, orient, "cell2");
};

export const getMaxStackHeight = () => {
  return pieces
    .slice()
    .reverse()
    .reduce((acc, row, index) => {
      return row.some((e) => e !== null) ? index + 1 : acc;
    }, 0);
};

