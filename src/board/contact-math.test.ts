/**
 * Pure contact-column helpers (no PIXI).
 */
import { describe, expect, it } from "vitest";
import { COLUMNS, ROWS, BOARD_ORIGIN_X, BOX_SIZE } from "../config";
import {
  cellsTouch,
  contactColumnsForItemOnGrid,
  continuousContactColumnsForItem,
  landYInColumnFromGrid,
} from "./contact-math";

const emptyGrid = (): (string | null)[][] =>
  Array.from({ length: ROWS }, () =>
    Array.from({ length: COLUMNS }, () => null),
  );

describe("cellsTouch", () => {
  it("same cell and ortho neighbors", () => {
    expect(cellsTouch(2, 3, 2, 3)).toBe(true);
    expect(cellsTouch(2, 3, 3, 3)).toBe(true);
    expect(cellsTouch(2, 3, 2, 4)).toBe(true);
  });
  it("rejects diagonal and far cells", () => {
    expect(cellsTouch(2, 3, 3, 4)).toBe(false);
    expect(cellsTouch(0, 0, 2, 0)).toBe(false);
  });
});

describe("landYInColumnFromGrid", () => {
  it("returns bottom row on empty column", () => {
    const g = emptyGrid();
    expect(landYInColumnFromGrid(g, 0)).toBe(ROWS - 1);
  });
  it("returns -1 when column is full", () => {
    const g = emptyGrid();
    for (let y = 0; y < ROWS; y++) g[y][1] = "x";
    expect(landYInColumnFromGrid(g, 1)).toBe(-1);
  });
  it("lands one above first occupied cell from top", () => {
    const g = emptyGrid();
    for (let y = 5; y < ROWS; y++) g[y][2] = "x";
    expect(landYInColumnFromGrid(g, 2)).toBe(4);
  });
  it("rejects out-of-range columns", () => {
    const g = emptyGrid();
    expect(landYInColumnFromGrid(g, -1)).toBe(-1);
    expect(landYInColumnFromGrid(g, COLUMNS)).toBe(-1);
  });
});

describe("contactColumnsForItemOnGrid", () => {
  it("includes columns that would touch an item on an empty board", () => {
    const g = emptyGrid();
    const cols = contactColumnsForItemOnGrid(g, 2, ROWS - 1);
    expect(cols.length).toBeGreaterThan(0);
    expect(cols).toContain(2);
  });

  it("skips columns that cannot fit a 2-cell vertical piece", () => {
    const g = emptyGrid();
    for (let y = 1; y < ROWS; y++) g[y][0] = "x";
    const cols = contactColumnsForItemOnGrid(g, 0, 0);
    expect(cols).not.toContain(0);
  });
});

describe("continuousContactColumnsForItem", () => {
  it("returns center column ±1", () => {
    const x = BOARD_ORIGIN_X + 2.5 * BOX_SIZE;
    const cols = continuousContactColumnsForItem(x);
    expect(cols).toEqual([1, 2, 3]);
  });

  it("clamps at board edges", () => {
    const left = continuousContactColumnsForItem(BOARD_ORIGIN_X + 1);
    expect(left[0]).toBe(0);
    expect(left).not.toContain(-1);
  });
});
