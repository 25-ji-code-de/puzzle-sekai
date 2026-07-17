/**
 * Single playfield pixel mapping: grid cell ↔ canvas pixels.
 *
 * Origin: (BOARD_ORIGIN_X, BOARD_ORIGIN_Y) = top-left of cell (0,0).
 * Derived so the bottom edge of row ROWS-1 sits OFFSET_BOTTOM above the
 * canvas bottom — matching historical activeLandPixelY floor math.
 *
 * Active fall, gravity place, and tip fulcrums MUST use these helpers.
 */
import {
  BOX_SIZE,
  BOARD_ORIGIN_X,
  BOARD_ORIGIN_Y,
  LEFT_BORDER,
  OFFSET_BOTTOM,
  ROWS,
  STAGE_HEIGHT,
} from "../../config";
import type { Orientation, PieceKind } from "../types";

/** Playfield origin Y for a given stage height (default = config STAGE_HEIGHT). */
export const boardOriginY = (stageHeight: number = STAGE_HEIGHT): number =>
  stageHeight - OFFSET_BOTTOM - ROWS * BOX_SIZE;

export const cellCenterX = (col: number): number =>
  LEFT_BORDER + col * BOX_SIZE + BOX_SIZE / 2;

export const cellCenterY = (
  row: number,
  stageHeight: number = STAGE_HEIGHT,
): number => boardOriginY(stageHeight) + row * BOX_SIZE + BOX_SIZE / 2;

export const cellTopLeftX = (col: number): number =>
  LEFT_BORDER + col * BOX_SIZE;

export const cellTopLeftY = (
  row: number,
  stageHeight: number = STAGE_HEIGHT,
): number => boardOriginY(stageHeight) + row * BOX_SIZE;

/**
 * Sprite anchor pixel for a primary cell.
 * - cell2 / item / shrunk: cell center
 * - big2x2: top-left of bottom-right (primary) cell = shared 4-cell corner
 */
export const primaryToPixel = (
  kind: PieceKind,
  ax: number,
  ay: number,
  stageHeight: number = STAGE_HEIGHT,
): { x: number; y: number } => {
  if (kind === "big2x2") {
    return {
      x: cellTopLeftX(ax),
      y: cellTopLeftY(ay, stageHeight),
    };
  }
  return {
    x: cellCenterX(ax),
    y: cellCenterY(ay, stageHeight),
  };
};

/**
 * Primary row when an active piece has `stackHeight` occupied rows under it.
 * Floor primary for orient 0 / item / big2x2: ROWS - 1 - stackHeight.
 * Upright cell2 (orient 2): primary is the upper cell → one row higher.
 */
export const activeLandPrimaryRow = (
  kind: PieceKind,
  stackHeight: number,
  orient: Orientation,
): number => {
  let row = ROWS - 1 - stackHeight;
  if (kind === "cell2" && orient === 2) row -= 1;
  return row;
};

/**
 * Pixel Y for active drop/land — same mapping as primaryToPixel.
 */
export const activeLandPixelY = (
  kind: PieceKind,
  stackHeight: number,
  orient: Orientation,
  stageHeight: number = STAGE_HEIGHT,
): number => {
  const row = activeLandPrimaryRow(kind, stackHeight, orient);
  return primaryToPixel(kind, 0, row, stageHeight).y;
};

export const activeDropPixelY = activeLandPixelY;

// Re-export fixed origin for callers that need the constant (default stage).
export { BOARD_ORIGIN_X, BOARD_ORIGIN_Y };
