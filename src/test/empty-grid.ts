/**
 * Empty rectangular board grids for unit tests (domain / board).
 */
import type { BoardGrid } from "../domain/piece/grid-write";

export const emptyBoardGrid = (rows: number, cols: number): BoardGrid =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
