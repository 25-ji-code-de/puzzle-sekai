/**
 * Pure board occupancy model: grid write/clear + gravity planning.
 * No PIXI. Presentation keeps sprites; this owns CellToken grid truth.
 */

import { COLUMNS, ROWS } from "../../config";
import type { CellToken, BoardGrid, BoardCell } from "../types";
import {
  type Cell,
  clearFootprint,
  writeFootprint,
  maxDropDistance,
  isUnsupported,
  dropFootprint,
  cloneGrid,
  copyGridInto,
  maxFootprintY,
} from "../piece";

// findClearChunk stays at board/clear-rules call sites (avoids domain→board cycles).

export type FootprintEntry = {
  /** Current cells occupied by this entity on the grid. */
  coords: Cell[];
  /** Token written into the grid for this footprint. */
  token: CellToken;
  /** Optional caller id (e.g. sprite index) echoed in GravityPlan. */
  id?: number;
};

export type GravityPlan = {
  from: Cell[];
  to: Cell[];
  dy: number;
  token: CellToken;
  id?: number;
};

const emptyGrid = (cols: number, rows: number): BoardGrid =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null as BoardCell),
  );

export class BoardModel {
  readonly cols: number;
  readonly rows: number;
  /** Live grid reference — mutated in place by write/clear/plan helpers. */
  grid: BoardGrid;

  constructor(cols: number = COLUMNS, rows: number = ROWS) {
    this.cols = cols;
    this.rows = rows;
    this.grid = emptyGrid(cols, rows);
  }

  reset(): void {
    this.grid = emptyGrid(this.cols, this.rows);
  }

  /** Replace internal grid with a clone of `src` (keeps shape). */
  load(src: BoardGrid): void {
    this.grid = cloneGrid(src);
  }

  write(coords: Cell[], token: CellToken): void {
    writeFootprint(this.grid, coords, token);
  }

  clear(coords: Cell[]): void {
    clearFootprint(this.grid, coords);
  }

  unsupported(coords: Cell[]): boolean {
    return isUnsupported(this.grid, coords, this.rows);
  }

  /**
   * Plan gravity for unsupported footprints.
   * Does not mutate the live grid permanently — simulates then restores.
   * Lowest pieces claim landing spots first.
   */
  planGravity(entries: FootprintEntry[]): GravityPlan[] {
    const movable = entries.filter(
      (e) => e.coords.length > 0 && this.unsupported(e.coords),
    );
    if (!movable.length) return [];

    const backup = cloneGrid(this.grid);
    const plans: GravityPlan[] = [];

    const ordered = [...movable].sort((a, b) => {
      const ay = maxFootprintY(a.coords);
      const by = maxFootprintY(b.coords);
      return by - ay;
    });

    for (const e of ordered) {
      clearFootprint(this.grid, e.coords);
    }

    for (const e of ordered) {
      const dy = maxDropDistance(this.grid, e.coords, this.rows);
      const to = dropFootprint(e.coords, dy);
      writeFootprint(this.grid, to, e.token);
      if (dy > 0) {
        plans.push({
          from: e.coords,
          to,
          dy,
          token: e.token,
          id: e.id,
        });
      }
    }

    copyGridInto(this.grid, backup);
    return plans;
  }

  /** Apply planned gravity permanently (write dest footprints after clear from). */
  applyGravityPlans(plans: GravityPlan[]): void {
    for (const p of plans) {
      clearFootprint(this.grid, p.from);
    }
    for (const p of plans) {
      writeFootprint(this.grid, p.to, p.token);
    }
  }
}

/** Process-wide singleton used by the live game facade. */
let liveBoard: BoardModel | null = null;

export const getLiveBoard = (): BoardModel => {
  if (!liveBoard) liveBoard = new BoardModel();
  return liveBoard;
};

/** Test helper / full reset of the singleton instance. */
export const resetLiveBoard = (): BoardModel => {
  liveBoard = new BoardModel();
  return liveBoard;
};
