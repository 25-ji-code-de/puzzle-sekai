/**
 * Grid occupancy mutation / drop-distance tests.
 */
import { describe, it, expect } from "vitest";
import {
  writeFootprint,
  clearFootprint,
  maxDropDistance,
  isUnsupported,
  dropFootprint,
  cloneGrid,
  copyGridInto,
} from "./grid-write";
import { cell } from "../types/cell";
import { emptyBoardGrid } from "../../test/empty-grid";

const emptyGrid = (rows = 4, cols = 4) => emptyBoardGrid(rows, cols);
describe("writeFootprint / clearFootprint", () => {
  it("writes tokens into in-bounds cells only", () => {
    const grid = emptyGrid();
    writeFootprint(
      grid,
      [cell(1, 1), cell(3, 3), cell(-1, 0), cell(0, 9)],
      "Ichika",
    );
    expect(grid[1][1]).toBe("Ichika");
    expect(grid[3][3]).toBe("Ichika");
    expect(grid[0][0]).toBeNull();
  });

  it("clears footprint cells", () => {
    const grid = emptyGrid();
    writeFootprint(grid, [cell(0, 0), cell(1, 0)], "Saki");
    clearFootprint(grid, [cell(0, 0)]);
    expect(grid[0][0]).toBeNull();
    expect(grid[0][1]).toBe("Saki");
  });
});

describe("maxDropDistance", () => {
  it("drops to floor when column is empty", () => {
    const grid = emptyGrid(5, 3);
    // cell at row 1 → can drop 3 rows (2,3,4)
    expect(maxDropDistance(grid, [cell(0, 1)], 5)).toBe(3);
  });

  it("stops above an occupied cell", () => {
    const grid = emptyGrid(5, 3);
    grid[4][1] = "Honami";
    // from y=0, can reach y=1,2,3 → drop 3
    expect(maxDropDistance(grid, [cell(1, 0)], 5)).toBe(3);
  });

  it("uses the tightest column for multi-cell footprints", () => {
    const grid = emptyGrid(5, 3);
    grid[3][0] = "Shiho";
    // left cell can only drop 2 (y=0 → y=1,2); right has freer path
    expect(maxDropDistance(grid, [cell(0, 0), cell(1, 0)], 5)).toBe(2);
  });

  it("empty coords → 0", () => {
    expect(maxDropDistance(emptyGrid(), [], 4)).toBe(0);
  });
});

describe("isUnsupported", () => {
  it("true when every bottom cell has empty space below", () => {
    const grid = emptyGrid(4, 3);
    expect(isUnsupported(grid, [cell(0, 1), cell(1, 1)], 4)).toBe(true);
  });

  it("false when any bottom cell rests on floor or occupied", () => {
    const grid = emptyGrid(4, 3);
    // on floor
    expect(isUnsupported(grid, [cell(0, 3)], 4)).toBe(false);
    // blocked by piece under one side
    grid[2][0] = "MikuLeo";
    expect(isUnsupported(grid, [cell(0, 1), cell(1, 1)], 4)).toBe(false);
  });

  it("empty coords → false", () => {
    expect(isUnsupported(emptyGrid(), [], 4)).toBe(false);
  });
});

describe("dropFootprint / clone / copy", () => {
  it("dropFootprint translates by dy", () => {
    expect(dropFootprint([cell(1, 2), cell(2, 2)], 3)).toEqual([
      [1, 5],
      [2, 5],
    ]);
  });

  it("cloneGrid is a deep copy", () => {
    const grid = emptyGrid(2, 2);
    grid[0][0] = "An";
    const cloned = cloneGrid(grid);
    cloned[0][0] = "Kohane";
    expect(grid[0][0]).toBe("An");
  });

  it("copyGridInto mutates destination in place", () => {
    const src = emptyGrid(2, 2);
    src[1][1] = "Toya";
    const dst = emptyGrid(2, 2);
    dst[0][0] = "Akito";
    copyGridInto(dst, src);
    expect(dst[0][0]).toBeNull();
    expect(dst[1][1]).toBe("Toya");
  });
});
