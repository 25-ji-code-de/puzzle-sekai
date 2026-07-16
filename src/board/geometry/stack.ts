/**
 * Stack-height queries over a board grid (pure).
 * Matches the historical reduce-from-bottom semantics used by active fall.
 */

import type { BoardGrid } from "./grid-write";
import type { Orientation } from "./footprint";
import type { PieceKind } from "./kinds";

/**
 * Columns occupied by a piece at primary column `primaryX`.
 * big2x2 primary is bottom-right → columns [primaryX-1, primaryX].
 */
export const columnsForPiece = (
  primaryX: number,
  orient: Orientation,
  kind: PieceKind,
): number[] => {
  if (kind === "big2x2") return [primaryX - 1, primaryX];
  if (kind === "item" || kind === "shrunk") return [primaryX];
  if (orient === 1) return [primaryX, primaryX + 1];
  if (orient === 3) return [primaryX - 1, primaryX];
  return [primaryX]; // vertical cell2
};

/**
 * How tall the stack is under a falling piece, counting from the board floor.
 *
 * Only rows with `index > belowExclusive` are considered (same filter as the
 * legacy getStackHeight / getNeneRoboStackHeight reduce). Empty gaps above
 * the floor still advance the height when a higher occupied cell is found.
 */
export const stackHeightBelow = (
  grid: BoardGrid,
  cols: number[],
  belowExclusive: number,
): number => {
  if (!cols.length) return 0;
  const rows = grid.length;
  let acc = 0;
  let revIndex = 0;
  for (let r = rows - 1; r > belowExclusive; r--) {
    const occupied = cols.some((c) => {
      if (c < 0 || c >= (grid[r]?.length ?? 0)) return false;
      return grid[r][c] != null;
    });
    if (occupied) acc = revIndex + 1;
    revIndex++;
  }
  return acc;
};

/** cell2 / item stack height from floor-primary coordinates. */
export const stackHeightForPrimary = (
  grid: BoardGrid,
  primary: { x: number; y: number },
  orient: Orientation,
  kind: PieceKind,
): number => {
  const cols = columnsForPiece(primary.x, orient, kind);
  // Standard pieces: only rows strictly below the primary (`index > y`).
  // big2x2 nene coords use top-left-ish y; caller passes adjusted exclusive.
  const belowExclusive = kind === "big2x2" ? primary.y - 1 : primary.y;
  return stackHeightBelow(grid, cols, belowExclusive);
};
