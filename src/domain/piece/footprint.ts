/**
 * Footprint ↔ primary-cell ↔ orientation (pure geometry).
 *
 * Orientation is domain/types only — do not redeclare here.
 *
 * Conventions:
 * - primary (x,y) is the sprite-derived cell for standard pieces
 * - big2x2 primary is bottom-right of the four cells
 * - orient 0 head-down vertical: cells (x,y)+(x,y-1), primary = lower
 * - orient 1 horizontal:        cells (x,y)+(x+1,y), primary = left
 * - orient 2 head-up vertical:  cells (x,y)+(x,y+1), primary = upper
 * - orient 3 horizontal:        cells (x,y)+(x-1,y), primary = right
 */
import type { PieceKind } from "../types/piece-kind";
import {
  type Cell,
  type Orientation,
  type Primary,
  type LoosePrimary,
  asOrientation,
  cell,
  asPrimary,
} from "../types/cell";
import { cellToXY, pickMaxX, pickMaxY, pickMinX, pickMinY } from "./cells";

export type { Orientation, Primary, LoosePrimary };
export { asOrientation };

/**
 * Build occupied cells from the primary cell + orientation + kind.
 * Single source of truth for "what does this piece cover?"
 */
export const footprintFromPrimary = (
  primaryIn: LoosePrimary | Primary,
  orient: Orientation,
  kind: PieceKind,
): Cell[] => {
  const { x, y } = primaryIn;
  if (kind === "item" || kind === "shrunk") {
    return [cell(x, y)];
  }
  if (kind === "big2x2") {
    return [cell(x, y), cell(x - 1, y), cell(x, y - 1), cell(x - 1, y - 1)];
  }
  switch (orient) {
    case 0:
      return [cell(x, y), cell(x, y - 1)];
    case 1:
      return [cell(x, y), cell(x + 1, y)];
    case 2:
      return [cell(x, y), cell(x, y + 1)];
    case 3:
      return [cell(x, y), cell(x - 1, y)];
    default: {
      const _exhaustive: never = orient;
      return _exhaustive;
    }
  }
};

/**
 * Primary / sprite-anchor cell for a footprint.
 * MUST respect orientation for 2-cell pieces.
 */
export const anchorFromFootprint = (
  cells: Cell[],
  kind: PieceKind,
  orient: Orientation = 0,
): Primary => {
  if (!cells.length) return asPrimary({ x: 0, y: 0 });
  if (kind !== "cell2" || cells.length === 1) {
    return asPrimary({
      x: Math.max(...cells.map(([cx]) => cx)),
      y: Math.max(...cells.map(([, cy]) => cy)),
    });
  }
  switch (orient) {
    case 0:
      return asPrimary(cellToXY(pickMaxY(cells)));
    case 1:
      return asPrimary(cellToXY(pickMinX(cells)));
    case 2:
      return asPrimary(cellToXY(pickMinY(cells)));
    case 3:
      return asPrimary(cellToXY(pickMaxX(cells)));
    default:
      return asPrimary(cellToXY(pickMaxY(cells)));
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
