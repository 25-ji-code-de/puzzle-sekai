/**
 * Shared grid helpers: adjacency, cell keys, bounds.
 * Pure utilities — no sprite / PIXI coupling.
 */
import { random as matchRandom } from "../domain/prng";

export const DIRS_ORTHO: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** Self + orthogonal neighbors (used by contact / allergy touch checks). */
export const DIRS_SELF_ORTHO: [number, number][] = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export const cellKey = (x: number, y: number): string => `${x},${y}`;

export const parseCellKey = (key: string): [number, number] => {
  const [x, y] = key.split(",").map(Number);
  return [x, y];
};

export const inBounds = (
  grid: readonly (readonly unknown[])[],
  x: number,
  y: number,
): boolean => y >= 0 && x >= 0 && y < grid.length && x < (grid[y]?.length ?? 0);

export const manhattan = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number => Math.abs(ax - bx) + Math.abs(ay - by);

/** Any cell of A is orthogonally adjacent to any cell of B. */
export const cellsOrthogonallyAdjacent = (
  a: [number, number][],
  b: [number, number][],
): boolean => {
  for (const [ax, ay] of a) {
    for (const [bx, by] of b) {
      if (manhattan(ax, ay, bx, by) === 1) return true;
    }
  }
  return false;
};

export const anyPairAdjacent = <T extends { cells?: [number, number][] }>(
  groupA: T[],
  groupB: T[],
): boolean => {
  for (const a of groupA) {
    if (!a.cells?.length) continue;
    for (const b of groupB) {
      if (!b.cells?.length) continue;
      if (cellsOrthogonallyAdjacent(a.cells, b.cells)) return true;
    }
  }
  return false;
};

export const isAdjacentToAny = (
  cells: [number, number][],
  others: [number, number][],
): boolean =>
  cells.some(([ex, ey]) =>
    others.some(([mx, my]) => manhattan(ex, ey, mx, my) === 1),
  );

/**
 * Fisher–Yates shuffle. Defaults to the match PRNG so wonder-blast / gameplay
 * shuffles follow the match seed; pass a custom rand for tests.
 */
export const shuffleInPlace = <T>(
  list: T[],
  rand: () => number = matchRandom,
): T[] => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
};
