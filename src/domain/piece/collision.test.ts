/**
 * Footprint vs grid collision tests (pure).
 */
import { describe, it, expect } from "vitest";
import { footprintCollides, willCollidePrimary } from "./collision";
import { cell } from "../types/cell";
import { emptyBoardGrid } from "../../test/empty-grid";

const emptyGrid = (rows = 4, cols = 4) => emptyBoardGrid(rows, cols);
describe("footprintCollides", () => {
  it("empty footprint never collides", () => {
    expect(footprintCollides(emptyGrid(), [])).toBe(false);
  });

  it("out of horizontal bounds", () => {
    expect(
      footprintCollides(emptyGrid(), [cell(-1, 0)], { rows: 4, cols: 4 }),
    ).toBe(true);
    expect(
      footprintCollides(emptyGrid(), [cell(4, 0)], { rows: 4, cols: 4 }),
    ).toBe(true);
  });

  it("floor (y >= rows) collides; above board (y < 0) does not", () => {
    expect(
      footprintCollides(emptyGrid(), [cell(0, 4)], { rows: 4, cols: 4 }),
    ).toBe(true);
    expect(
      footprintCollides(emptyGrid(), [cell(0, -1)], { rows: 4, cols: 4 }),
    ).toBe(false);
  });

  it("occupied cell collides", () => {
    const grid = emptyGrid();
    grid[2][1] = "Ichika";
    expect(footprintCollides(grid, [cell(1, 2)], { rows: 4, cols: 4 })).toBe(
      true,
    );
    expect(footprintCollides(grid, [cell(0, 2)], { rows: 4, cols: 4 })).toBe(
      false,
    );
  });
});

describe("willCollidePrimary", () => {
  it("NaN / undefined primary always collides", () => {
    expect(willCollidePrimary(emptyGrid(), { x: Number.NaN, y: 0 }, 0)).toBe(
      true,
    );
    expect(
      willCollidePrimary(
        emptyGrid(),
        { x: undefined as unknown as number, y: 0 },
        0,
      ),
    ).toBe(true);
  });

  it("cell2 orient 0 collides when lower or upper cell occupied", () => {
    const grid = emptyGrid(6, 6);
    grid[3][2] = "Saki";
    // primary (2,3) covers (2,3)+(2,2)
    expect(willCollidePrimary(grid, { x: 2, y: 3 }, 0, "cell2")).toBe(true);
    expect(willCollidePrimary(grid, { x: 4, y: 3 }, 0, "cell2")).toBe(false);
  });

  it("cell2 horizontal orients collide on either side cell", () => {
    const grid = emptyGrid(6, 6);
    grid[3][3] = "Honami";
    // orient 1: (2,3)+(3,3)
    expect(willCollidePrimary(grid, { x: 2, y: 3 }, 1, "cell2")).toBe(true);
    // orient 3: (4,3)+(3,3)
    expect(willCollidePrimary(grid, { x: 4, y: 3 }, 3, "cell2")).toBe(true);
    expect(willCollidePrimary(grid, { x: 0, y: 3 }, 1, "cell2")).toBe(false);
  });

  it("item only occupies primary cell", () => {
    const grid = emptyGrid(4, 4);
    grid[1][1] = "Item";
    expect(willCollidePrimary(grid, { x: 1, y: 1 }, 0, "item")).toBe(true);
    expect(willCollidePrimary(grid, { x: 2, y: 1 }, 0, "item")).toBe(false);
  });

  it("big2x2 primary is bottom-right of four cells", () => {
    const grid = emptyGrid(6, 6);
    grid[2][1] = "Honami"; // top-left of a 2x2 at primary (2,3)
    expect(willCollidePrimary(grid, { x: 2, y: 3 }, 0, "big2x2")).toBe(true);
    expect(willCollidePrimary(grid, { x: 4, y: 3 }, 0, "big2x2")).toBe(false);
  });

  it("defaults kind to cell2", () => {
    const grid = emptyGrid(6, 6);
    grid[2][1] = "Shiho";
    // primary (1,3) orient 0 → (1,3)+(1,2)
    expect(willCollidePrimary(grid, { x: 1, y: 3 }, 0)).toBe(true);
  });
});
