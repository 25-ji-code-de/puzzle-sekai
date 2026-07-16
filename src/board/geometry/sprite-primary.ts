/**
 * Sprite ↔ primary cell (medium layer, PIXI-aware).
 * cell2 / item use cell-center mapping; big2x2 uses center-of-square mapping.
 */

import type * as PIXI from "pixi.js-legacy";
import { BOX_SIZE, LEFT_BORDER } from "../../config";
import type { PieceKind } from "../../domain/piece/kinds";
import { placeSpriteAtAnchor } from "./placement";

export type RoundMethod = "floor" | "ceil" | "round";

/**
 * Primary grid cell from a live sprite pose.
 * - cell2 / item / shrunk: cell center → (x,y)
 * - big2x2: sprite center at bottom-right cell top-left → primary = bottom-right
 */
export const primaryFromSprite = (
  sprite: PIXI.Sprite,
  kind: PieceKind,
  method: RoundMethod = "ceil",
): { x: number; y: number } => {
  if (kind === "big2x2") {
    // Center sits on the shared corner of the 4 cells (= top-left of bottom-right).
    return {
      x: Math[method]((sprite.x - LEFT_BORDER) / BOX_SIZE),
      y: Math[method](sprite.y / BOX_SIZE),
    };
  }
  return {
    x: Math[method]((sprite.x - BOX_SIZE / 2 - LEFT_BORDER) / BOX_SIZE),
    y: Math[method]((sprite.y - BOX_SIZE / 2) / BOX_SIZE),
  };
};

/** Place sprite so its primary matches (x,y) for the given kind. */
export const placeSpritePrimary = (
  sprite: PIXI.Sprite,
  kind: PieceKind,
  x: number,
  y: number,
): void => {
  placeSpriteAtAnchor(sprite, kind, x, y);
};
