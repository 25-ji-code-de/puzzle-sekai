/**
 * Manhattan distance on integer cell grids (pure).
 */
export const manhattan = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number => Math.abs(ax - bx) + Math.abs(ay - by);

/** Minimum Manhattan distance from (x,y) to any cell in `cells`. Empty → Infinity. */
export const minManhattanToCells = (
  x: number,
  y: number,
  cells: readonly (readonly [number, number])[],
): number => {
  if (!cells.length) return Number.POSITIVE_INFINITY;
  let best = Number.POSITIVE_INFINITY;
  for (const [cx, cy] of cells) {
    const d = manhattan(x, y, cx, cy);
    if (d < best) best = d;
  }
  return best;
};
