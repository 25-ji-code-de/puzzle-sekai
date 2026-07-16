/**
 * Sprite placement from geometry anchors (medium layer).
 * Single place that knows how each PieceKind maps anchor cell → pixels.
 */

import type * as PIXI from "pixi.js-legacy";
import { BOX_SIZE, LEFT_BORDER } from "../../config";
import { moveToCoordinate } from "../../utils/coords";
import type { PieceKind } from "../../domain/piece/kinds";

/** Pixel Y of the sprite when its anchor cell is `ay`. */
export const anchorPixelY = (kind: PieceKind, ay: number): number =>
  kind === "big2x2" ? ay * BOX_SIZE : BOX_SIZE * ay + BOX_SIZE / 2;

/** Pixel X of the sprite when its anchor cell is `ax`. */
export const anchorPixelX = (kind: PieceKind, ax: number): number =>
  kind === "big2x2"
    ? LEFT_BORDER + ax * BOX_SIZE
    : LEFT_BORDER + ax * BOX_SIZE + BOX_SIZE / 2;

/**
 * Snap sprite to the primary/anchor cell.
 * - cell2 / item / shrunk: cell-center via moveToCoordinate
 * - big2x2: center of the 2×2 = top-left of bottom-right cell
 */
export const placeSpriteAtAnchor = (
  sprite: PIXI.Sprite,
  kind: PieceKind,
  ax: number,
  ay: number,
): void => {
  if (kind === "big2x2") {
    sprite.x = anchorPixelX(kind, ax);
    sprite.y = anchorPixelY(kind, ay);
    return;
  }
  moveToCoordinate(sprite, ax, ay);
};
