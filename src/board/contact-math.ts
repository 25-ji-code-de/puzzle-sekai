/**
 * Pure contact-column math (no PIXI / board state / fun flags).
 * Runtime wrappers live in contact.ts.
 */
import { COLUMNS, ROWS } from "../config";
import { manhattan } from "./grid";
import { footprintFromPrimary } from "../domain/piece";
import { projectToColumn } from "./dynamics/proximity";

/** Same cell or orthogonal neighbor. */
export const cellsTouch = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean => manhattan(ax, ay, bx, by) <= 1;

/**
 * Landing row (bottom cell) for a piece falling in `col` under gravity,
 * assuming the column is a solid stack from the bottom (post-gravity).
 * Returns -1 if the column is full or out of range.
 */
export const landYInColumnFromGrid = (
  grid: ReadonlyArray<ReadonlyArray<unknown>>,
  col: number,
): number => {
  if (col < 0 || col >= COLUMNS) return -1;
  for (let y = 0; y < ROWS; y++) {
    if (grid[y]?.[col] != null) {
      return y - 1;
    }
  }
  return ROWS - 1;
};

/**
 * Columns where a default-orientation cell2, after falling, would touch
 * the item cell (same or edge-adjacent).
 */
export const contactColumnsForItemOnGrid = (
  grid: ReadonlyArray<ReadonlyArray<unknown>>,
  itemX: number,
  itemY: number,
): number[] => {
  const cols: number[] = [];
  for (let col = 0; col < COLUMNS; col++) {
    const landY = landYInColumnFromGrid(grid, col);
    // Default spawn is vertical head-down (orient 0); need room for upper cell.
    if (landY < 1) continue;
    const cells = footprintFromPrimary({ x: col, y: landY }, 0, "cell2");
    if (cells.some(([x, y]) => cellsTouch(x, y, itemX, itemY))) {
      cols.push(col);
    }
  }
  return cols;
};

/**
 * Continuous: center column of item sprite X ±1, clamped to the board.
 */
export const continuousContactColumnsForItem = (
  itemSpriteX: number,
): number[] => {
  const centerCol = projectToColumn(itemSpriteX);
  const cols = new Set<number>();
  for (const d of [-1, 0, 1]) {
    const c = centerCol + d;
    if (c >= 0 && c < COLUMNS) cols.add(c);
  }
  return [...cols].sort((a, b) => a - b);
};
