/**
 * Footprint vs grid occupancy (pure).
 * Single collision path for active pieces — no parallel orient switch tables.
 */

import { COLUMNS, ROWS } from "../../config";
import type { BoardGrid } from "./grid-write";
import type { Cell, Orientation, PieceKind } from "../types";
import { footprintFromPrimary } from "./footprint";

/**
 * True if any footprint cell is out of horizontal/floor bounds or lands on
 * an occupied grid cell. Cells with y < 0 (above the board) are allowed so
 * spawn-band pieces can still move while partially off-screen.
 */
export const footprintCollides = (
  grid: BoardGrid,
  cells: Cell[],
  opts?: { rows?: number; cols?: number },
): boolean => {
  const rows = opts?.rows ?? ROWS;
  const cols = opts?.cols ?? COLUMNS;
  for (const [x, y] of cells) {
    if (x < 0 || x >= cols) return true;
    if (y >= rows) return true;
    if (y < 0) continue;
    if (grid[y]?.[x] != null) return true;
  }
  return false;
};

/** Collision for a primary cell + orientation + kind against a board grid. */
export const willCollidePrimary = (
  grid: BoardGrid,
  primary: { x: number; y: number },
  orient: Orientation,
  kind: PieceKind = "cell2",
): boolean => {
  if (
    primary.x === undefined ||
    primary.y === undefined ||
    Number.isNaN(primary.x) ||
    Number.isNaN(primary.y)
  ) {
    return true;
  }
  const cells = footprintFromPrimary(primary, orient, kind);
  return footprintCollides(grid, cells);
};
