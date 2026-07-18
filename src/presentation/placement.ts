/**
 * PIXI placement: grid primary ↔ sprite pixel pose.
 * Pure pixel math lives in domain/piece/pixel; this file is the only PIXI bridge.
 */
import type * as PIXI from "pixi.js-legacy";
import { BOX_SIZE, LEFT_BORDER, STAGE_HEIGHT } from "../config";
import type { PieceKind, RoundMethod } from "../domain/types";
import {
  boardOriginY,
  primaryToPixel,
  cellCenterY,
  cellTopLeftY,
} from "../domain/piece";

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

/**
 * Primary grid cell from a live sprite pose.
 * - cell2 / item / shrunk: cell center → (x,y)
 * - big2x2: sprite at top-left of bottom-right cell → primary = bottom-right
 */
export const primaryFromSprite = (
  sprite: PIXI.Sprite,
  kind: PieceKind,
  method: RoundMethod = "ceil",
  stageHeight: number = STAGE_HEIGHT,
): { x: number; y: number } => {
  // Destroyed display objects null out transform; callers that still hold a
  // stale sprite ref must not throw mid-control handler.
  if (!sprite.transform) {
    return { x: 0, y: 0 };
  }
  const originY = boardOriginY(stageHeight);
  if (kind === "big2x2") {
    return {
      x: Math[method]((sprite.x - LEFT_BORDER) / BOX_SIZE),
      y: Math[method]((sprite.y - originY) / BOX_SIZE),
    };
  }
  return {
    x: Math[method]((sprite.x - BOX_SIZE / 2 - LEFT_BORDER) / BOX_SIZE),
    y: Math[method]((sprite.y - BOX_SIZE / 2 - originY) / BOX_SIZE),
  };
};
