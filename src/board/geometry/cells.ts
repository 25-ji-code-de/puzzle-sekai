/**
 * Pure cell-list pickers — no sprites, no grid mutation.
 */

export type Cell = [number, number];

export const cellToXY = (c: Cell): { x: number; y: number } => ({
  x: c[0],
  y: c[1],
});

export const pickMaxY = (cells: Cell[]): Cell =>
  cells.reduce((a, b) => (a[1] >= b[1] ? a : b));

export const pickMinY = (cells: Cell[]): Cell =>
  cells.reduce((a, b) => (a[1] <= b[1] ? a : b));

export const pickMinX = (cells: Cell[]): Cell =>
  cells.reduce((a, b) => (a[0] <= b[0] ? a : b));

export const pickMaxX = (cells: Cell[]): Cell =>
  cells.reduce((a, b) => (a[0] >= b[0] ? a : b));

/** All cells on the lowest row of the footprint. */
export const bottomCells = (cells: Cell[]): Cell[] => {
  if (!cells.length) return [];
  const maxY = Math.max(...cells.map(([, y]) => y));
  return cells.filter(([, y]) => y === maxY) as Cell[];
};

/** Highest row index in the footprint. */
export const maxFootprintY = (cells: Cell[]): number =>
  cells.length ? Math.max(...cells.map(([, y]) => y)) : -1;

/** Translate every cell by (dx, dy). */
export const translateCells = (
  cells: Cell[],
  dx: number,
  dy: number,
): Cell[] => cells.map(([x, y]) => [x + dx, y + dy] as Cell);
