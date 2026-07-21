/**
 * Pure cell-list pickers — no sprites, no grid mutation.
 * Brands (Cell / Col / Row) live in domain/types — import there.
 */
import { type Cell, type ReadonlyCell, cell, asCell } from "../types/cell";
import { maxOf } from "../../util/minmax";

export const cellToXY = (c: ReadonlyCell): { x: number; y: number } => ({
  x: c[0],
  y: c[1],
});

export const pickMaxY = (cells: readonly ReadonlyCell[]): Cell => {
  const best = cells.reduce((a, b) => (a[1] >= b[1] ? a : b));
  return asCell(best);
};

export const pickMinY = (cells: readonly ReadonlyCell[]): Cell => {
  const best = cells.reduce((a, b) => (a[1] <= b[1] ? a : b));
  return asCell(best);
};

export const pickMinX = (cells: readonly ReadonlyCell[]): Cell => {
  const best = cells.reduce((a, b) => (a[0] <= b[0] ? a : b));
  return asCell(best);
};

export const pickMaxX = (cells: readonly ReadonlyCell[]): Cell => {
  const best = cells.reduce((a, b) => (a[0] >= b[0] ? a : b));
  return asCell(best);
};

/** All cells on the lowest row of the footprint. */
export const bottomCells = (cells: readonly ReadonlyCell[]): Cell[] => {
  if (!cells.length) return [];
  const maxY = maxOf(cells.map(([, y]) => y));
  return cells.filter(([, y]) => y === maxY).map(asCell);
};

/** Highest row index in the footprint. */
export const maxFootprintY = (cells: readonly ReadonlyCell[]): number =>
  cells.length ? maxOf(cells.map(([, y]) => y)) : -1;

/** Translate every cell by (dx, dy). */
export const translateCells = (
  cells: readonly ReadonlyCell[],
  dx: number,
  dy: number,
): Cell[] => cells.map(([x, y]) => cell(x + dx, y + dy));
