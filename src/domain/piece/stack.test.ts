/**
 * Stack-height query tests (pure).
 */
import { describe, it, expect } from "vitest";
import {
  columnsForPiece,
  stackHeightBelow,
  stackHeightForPrimary,
  maxOccupiedHeight,
} from "./stack";
import type { BoardGrid } from "./grid-write";

const emptyGrid = (rows = 6, cols = 4): BoardGrid =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));

describe("columnsForPiece", () => {
  it("vertical cell2 / item / shrunk use primary column only", () => {
    expect(columnsForPiece(2, 0, "cell2")).toEqual([2]);
    expect(columnsForPiece(2, 2, "cell2")).toEqual([2]);
    expect(columnsForPiece(3, 0, "item")).toEqual([3]);
    expect(columnsForPiece(1, 0, "shrunk")).toEqual([1]);
  });

  it("horizontal cell2 spans two columns by orient", () => {
    expect(columnsForPiece(2, 1, "cell2")).toEqual([2, 3]);
    expect(columnsForPiece(2, 3, "cell2")).toEqual([1, 2]);
  });

  it("big2x2 primary is bottom-right", () => {
    expect(columnsForPiece(3, 0, "big2x2")).toEqual([2, 3]);
  });
});

describe("stackHeightBelow", () => {
  it("empty columns → 0", () => {
    expect(stackHeightBelow(emptyGrid(), [0, 1], -1)).toBe(0);
  });

  it("counts from floor including gaps", () => {
    const grid = emptyGrid(5, 3);
    // occupy row 4 (floor) and row 2, leave row 3 empty
    grid[4][0] = "Ichika";
    grid[2][0] = "Saki";
    // scanning from bottom: revIndex 0 at r=4 occupied → acc=1
    // r=3 empty → acc stays 1
    // r=2 occupied → acc=3
    // r=1 empty
    // r=0 empty; belowExclusive=-1 includes all
    expect(stackHeightBelow(grid, [0], -1)).toBe(3);
  });

  it("belowExclusive cuts off higher rows", () => {
    const grid = emptyGrid(5, 3);
    grid[4][1] = "Honami";
    grid[1][1] = "Shiho";
    // only rows with index > 2 → rows 3,4
    expect(stackHeightBelow(grid, [1], 2)).toBe(1);
  });

  it("multi-column: any occupied column marks the layer", () => {
    const grid = emptyGrid(4, 3);
    grid[3][2] = "Minori";
    expect(stackHeightBelow(grid, [0, 2], -1)).toBe(1);
  });
});

describe("stackHeightForPrimary", () => {
  it("cell2 uses primary.y as exclusive bound", () => {
    const grid = emptyGrid(6, 4);
    grid[5][1] = "Haruka";
    grid[4][1] = "Airi";
    // primary at y=3 → only rows > 3
    expect(stackHeightForPrimary(grid, { x: 1, y: 3 }, 0, "cell2")).toBe(2);
  });

  it("big2x2 exclusive is primary.y - 1", () => {
    const grid = emptyGrid(6, 4);
    grid[5][2] = "NeneRobo";
    // primary y=4 → exclusive 3 → rows 4,5; row4 empty, row5 occupied → height 1
    expect(stackHeightForPrimary(grid, { x: 2, y: 4 }, 0, "big2x2")).toBe(1);
  });
});

describe("maxOccupiedHeight", () => {
  it("empty board → 0", () => {
    expect(maxOccupiedHeight(emptyGrid())).toBe(0);
  });

  it("tracks highest occupied row from floor", () => {
    const grid = emptyGrid(5, 3);
    grid[4][0] = "Emu";
    expect(maxOccupiedHeight(grid)).toBe(1);
    grid[2][1] = "Tsukasa";
    // floor index 0..4; highest occupied is row 2 → height 3
    expect(maxOccupiedHeight(grid)).toBe(3);
  });
});
