/**
 * Sprite placement from geometry anchors (medium layer).
 * Pixel math is domain/piece/pixel — single BOARD_ORIGIN mapping.
 */
import type * as PIXI from "pixi.js-legacy";
import type { PieceKind } from "../../domain/piece/kinds";
import {
  primaryToPixel,
  cellCenterY,
  cellTopLeftY,
} from "../../domain/piece/pixel";
import { STAGE_HEIGHT } from "../../config";

/** Pixel Y of the sprite when its anchor cell is `ay`. */
export const anchorPixelY = (
  kind: PieceKind,
  ay: number,
  stageHeight: number = STAGE_HEIGHT,
): number =>
  kind === "big2x2"
    ? cellTopLeftY(ay, stageHeight)
    : cellCenterY(ay, stageHeight);

/** Pixel X of the sprite when its anchor cell is `ax`. */
export const anchorPixelX = (kind: PieceKind, ax: number): number =>
  primaryToPixel(kind, ax, 0).x;

/**
 * Snap sprite to the primary/anchor cell (unified playfield origin).
 */
export const placeSpriteAtAnchor = (
  sprite: PIXI.Sprite,
  kind: PieceKind,
  ax: number,
  ay: number,
  stageHeight: number = STAGE_HEIGHT,
): void => {
  const { x, y } = primaryToPixel(kind, ax, ay, stageHeight);
  sprite.x = x;
  sprite.y = y;
};
