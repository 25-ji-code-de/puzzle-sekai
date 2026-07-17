/**
 * Sprite ↔ primary cell (medium layer, PIXI-aware).
 * Inverse of primaryToPixel / placeSpriteAtAnchor (unified BOARD_ORIGIN).
 * RoundMethod is defined only in domain/types.
 */
import type * as PIXI from "pixi.js-legacy";
import { BOX_SIZE, LEFT_BORDER, STAGE_HEIGHT } from "../../config";
import type { PieceKind } from "../../domain/types";
import type { RoundMethod } from "../../domain/types";
import { boardOriginY } from "../../domain/piece/pixel";
import { placeSpriteAtAnchor } from "./placement";

export type { RoundMethod };

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

/** Place sprite so its primary matches (x,y) for the given kind. */
export const placeSpritePrimary = (
  sprite: PIXI.Sprite,
  kind: PieceKind,
  x: number,
  y: number,
  stageHeight: number = STAGE_HEIGHT,
): void => {
  placeSpriteAtAnchor(sprite, kind, x, y, stageHeight);
};
