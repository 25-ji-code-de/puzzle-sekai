/**
 * Grid occupancy mutations and drop-distance (medium layer).
 * All take the board grid explicitly so they stay testable.
 */

import { ROWS } from "../../config";
import type { BoardCell, BoardGrid as DomainBoardGrid } from "../types";
import type { Cell } from "./cells";
import { bottomCells, translateCells } from "./cells";

/** Prefer domain BoardGrid; keep alias for geometry callers. */
export type BoardGrid = DomainBoardGrid;

/** Write token into each footprint cell (in-bounds only). */
export const writeFootprint = (
  grid: BoardGrid,
  coords: Cell[],
  name: BoardCell & string,
): void => {
  for (const [x, y] of coords) {
    if (y >= 0 && y < grid.length && x >= 0 && x < (grid[y]?.length ?? 0)) {
      grid[y][x] = name;
    }
  }
};

/** Clear each footprint cell (in-bounds only). */
export const clearFootprint = (grid: BoardGrid, coords: Cell[]): void => {
  for (const [x, y] of coords) {
    if (y >= 0 && y < grid.length && x >= 0 && x < (grid[y]?.length ?? 0)) {
      grid[y][x] = null;
    }
  }
};

/**
 * How many rows the footprint can drop before floor / another piece.
 * Caller must have already cleared this footprint from the grid.
 */
export const maxDropDistance = (
  grid: BoardGrid,
  coords: Cell[],
  rows: number = ROWS,
): number => {
  if (!coords.length) return 0;
  let drop = Infinity;
  for (const [x, y] of coords) {
    let d = 0;
    for (let ny = y + 1; ny < rows; ny++) {
      if (grid[ny]?.[x] != null) break;
      d++;
    }
    drop = Math.min(drop, d);
  }
  return drop === Infinity ? 0 : drop;
};

/** True if every bottom cell has empty space (or is above floor) beneath it. */
export const isUnsupported = (
  grid: BoardGrid,
  coords: Cell[],
  rows: number = ROWS,
): boolean => {
  const bottom = bottomCells(coords);
  if (!bottom.length) return false;
  return bottom.every(
    ([x, y]) => y + 1 < rows && grid[y + 1]?.[x] === null,
  );
};

/** Destination footprint after dropping `dy` rows. */
export const dropFootprint = (coords: Cell[], dy: number): Cell[] =>
  translateCells(coords, 0, dy);

/** Deep-clone a board grid (for plan/simulate then restore). */
export const cloneGrid = (grid: BoardGrid): BoardGrid =>
  grid.map((row) => [...row]);

/** Copy `src` into `dst` in place (same shape). */
export const copyGridInto = (dst: BoardGrid, src: BoardGrid): void => {
  src.forEach((row, i) => {
    row.forEach((v, j) => {
      dst[i][j] = v;
    });
  });
};
