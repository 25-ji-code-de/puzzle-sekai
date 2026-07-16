/**
 * Active-piece land / drop pixel Y (playfield bottom origin).
 *
 * Active controllers historically measure from canvas bottom via OFFSET_BOTTOM,
 * not the top-down cell-center map used by settled gravity. Keep that formula
 * here so piece / nenerobo / items share one definition without each re-deriving.
 */

import { BOX_SIZE, OFFSET_BOTTOM } from "../../config";
import type { PieceKind } from "./kinds";
import type { Orientation } from "./footprint";

/**
 * Pixel Y the active sprite must not pass (and snaps to on land).
 * Identical for drop-limit and land snap in all current call sites.
 */
export const activeLandPixelY = (
  kind: PieceKind,
  stackHeight: number,
  orient: Orientation,
  stageHeight: number,
): number => {
  if (kind === "big2x2") {
    // 2×2 center sits one full cell above the floor of the bottom row
    return (
      stageHeight - OFFSET_BOTTOM - BOX_SIZE * stackHeight - BOX_SIZE
    );
  }
  // cell2 / item / shrunk — cell-center; upright (orient 2) primary is the
  // upper cell so the lower cell needs an extra BOX of clearance.
  const uprightExtra = kind === "cell2" && orient === 2 ? BOX_SIZE : 0;
  return (
    stageHeight -
    (BOX_SIZE / 2 + OFFSET_BOTTOM) -
    BOX_SIZE * stackHeight -
    uprightExtra
  );
};

/** Alias — drop ceiling and land snap use the same expression today. */
export const activeDropPixelY = activeLandPixelY;
