/**
 * Footprint ↔ primary-cell ↔ orientation (pure geometry).
 *
 * Conventions match updateCoordinates / getCoordinates:
 * - primary (x,y) is the sprite-derived cell center for standard pieces
 * - big2x2 primary is bottom-right of the four cells
 * - orient 0 head-down vertical: cells (x,y)+(x,y-1), primary = lower
 * - orient 1 horizontal:        cells (x,y)+(x+1,y), primary = left
 * - orient 2 head-up vertical:  cells (x,y)+(x,y+1), primary = upper
 * - orient 3 horizontal:        cells (x,y)+(x-1,y), primary = right
 */

import type { PieceKind } from "./kinds";
import {
  type Cell,
  cellToXY,
  pickMaxX,
  pickMaxY,
  pickMinX,
  pickMinY,
} from "./cells";

export type Orientation = 0 | 1 | 2 | 3;

export const asOrientation = (n: number): Orientation =>
  (((n % 4) + 4) % 4) as Orientation;

/**
 * Build occupied cells from the primary cell + orientation + kind.
 * This is the single source of truth for "what does this piece cover?"
 */
export const footprintFromPrimary = (
  primary: { x: number; y: number },
  orient: Orientation,
  kind: PieceKind,
): Cell[] => {
  const { x, y } = primary;
  if (kind === "item" || kind === "shrunk") {
    return [[x, y]];
  }
  if (kind === "big2x2") {
    return [
      [x, y],
      [x - 1, y],
      [x, y - 1],
      [x - 1, y - 1],
    ];
  }
  switch (orient) {
    case 0:
      return [
        [x, y],
        [x, y - 1],
      ];
    case 1:
      return [
        [x, y],
        [x + 1, y],
      ];
    case 2:
      return [
        [x, y],
        [x, y + 1],
      ];
    case 3:
      return [
        [x, y],
        [x - 1, y],
      ];
  }
};

/**
 * Primary / sprite-anchor cell for a footprint.
 * MUST respect orientation for 2-cell pieces — picking lower/left always
 * sinks orient 2 / 3 by one full cell visually while grid stays correct.
 */
export const anchorFromFootprint = (
  cells: Cell[],
  kind: PieceKind,
  orient: Orientation = 0,
): { x: number; y: number } => {
  if (!cells.length) return { x: 0, y: 0 };
  if (kind !== "cell2" || cells.length === 1) {
    return {
      x: Math.max(...cells.map(([cx]) => cx)),
      y: Math.max(...cells.map(([, cy]) => cy)),
    };
  }
  switch (orient) {
    case 0:
      return cellToXY(pickMaxY(cells));
    case 1:
      return cellToXY(pickMinX(cells));
    case 2:
      return cellToXY(pickMinY(cells));
    case 3:
      return cellToXY(pickMaxX(cells));
    default:
      return cellToXY(pickMaxY(cells));
  }
};

/**
 * Canonical orientation after a rigid remap (e.g. cantilever tip).
 * Vertical 2-cell → 0 (head-down), horizontal → 1. Non-cell2 → 0.
 */
export const orientFromFootprint = (
  cells: Cell[],
  kind: PieceKind,
): Orientation => {
  if (kind !== "cell2" || cells.length < 2) return 0;
  const [a, b] = cells;
  if (a[0] === b[0]) return 0;
  return 1;
};
