/**
 * Pure domain tests — no PIXI / DOM.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { BoardModel } from "./model";
import {
  footprintFromPrimary,
  anchorFromFootprint,
  columnsForPiece,
  willCollidePrimary,
} from "../piece";
import { CHAR } from "../../characters/ids";
import { ITEM_TOKEN, cell } from "../types";

describe("footprint anchors", () => {
  it("orient 0 primary is lower cell; anchor recovers primary", () => {
    const cells = footprintFromPrimary({ x: 2, y: 5 }, 0, "cell2");
    expect(cells).toEqual([
      [2, 5],
      [2, 4],
    ]);
    expect(anchorFromFootprint(cells, "cell2", 0)).toEqual({ x: 2, y: 5 });
  });

  it("orient 2 primary is upper cell — prevents sink-one-cell", () => {
    const cells = footprintFromPrimary({ x: 2, y: 4 }, 2, "cell2");
    expect(cells).toEqual([
      [2, 4],
      [2, 5],
    ]);
    expect(anchorFromFootprint(cells, "cell2", 2)).toEqual({ x: 2, y: 4 });
  });
});

describe("big2x2 primary (bottom-right)", () => {
  it("footprint and columns use primary as bottom-right", () => {
    const cells = footprintFromPrimary({ x: 3, y: 5 }, 0, "big2x2");
    expect(cells).toEqual([
      [3, 5],
      [2, 5],
      [3, 4],
      [2, 4],
    ]);
    expect(columnsForPiece(3, 0, "big2x2")).toEqual([2, 3]);
  });

  it("willCollidePrimary sees the left column under a 2x2", () => {
    const board = new BoardModel(6, 8);
    board.write([cell(2, 5)], CHAR.Ichika);
    expect(willCollidePrimary(board.grid, { x: 3, y: 5 }, 0, "big2x2")).toBe(
      true,
    );
    expect(willCollidePrimary(board.grid, { x: 3, y: 4 }, 0, "big2x2")).toBe(
      false,
    );
  });
});

describe("BoardModel write / clear / unsupported", () => {
  let board: BoardModel;

  beforeEach(() => {
    board = new BoardModel(6, 8);
  });

  it("write and clear mutate grid cells", () => {
    board.write([cell(2, 3), cell(2, 4)], CHAR.Honami);
    expect(board.grid[3][2]).toBe(CHAR.Honami);
    expect(board.grid[4][2]).toBe(CHAR.Honami);
    board.clear([cell(2, 3)]);
    expect(board.grid[3][2]).toBeNull();
    expect(board.grid[4][2]).toBe(CHAR.Honami);
  });

  it("unsupported is true mid-air and false on floor", () => {
    board.write([cell(0, 2)], CHAR.Shiho);
    expect(board.unsupported([cell(0, 2)])).toBe(true);
    expect(board.unsupported([cell(0, 7)])).toBe(false);
  });

  it("reset clears all cells; load clones source", () => {
    board.write([cell(1, 1)], CHAR.Minori);
    board.reset();
    expect(board.grid.every((row) => row.every((c) => c === null))).toBe(true);

    const src = new BoardModel(6, 8);
    src.write([cell(4, 5)], CHAR.Haruka);
    board.load(src.grid);
    board.grid[5][4] = null;
    expect(src.grid[5][4]).toBe(CHAR.Haruka);
  });
});

describe("BoardModel.planGravity", () => {
  let board: BoardModel;

  beforeEach(() => {
    board = new BoardModel(6, 8);
  });

  it("drops an unsupported footprint onto the floor", () => {
    board.write([cell(3, 2)], CHAR.Ichika);
    const plans = board.planGravity([
      { coords: [cell(3, 2)], token: CHAR.Ichika, id: 1 },
    ]);
    expect(plans).toHaveLength(1);
    expect(plans[0].dy).toBe(5);
    expect(plans[0].to).toEqual([cell(3, 7)]);
    expect(board.grid[2][3]).toBe(CHAR.Ichika);
    expect(board.grid[7][3]).toBeNull();
  });

  it("stacks on top of a lower piece", () => {
    board.write([cell(1, 7)], ITEM_TOKEN);
    board.write([cell(1, 3)], CHAR.Saki);
    const plans = board.planGravity([
      { coords: [cell(1, 3)], token: CHAR.Saki, id: 0 },
    ]);
    expect(plans).toHaveLength(1);
    expect(plans[0].to).toEqual([cell(1, 6)]);
  });

  it("applyGravityPlans commits dest footprints", () => {
    board.write([cell(0, 1)], CHAR.Emu);
    const plans = board.planGravity([
      { coords: [cell(0, 1)], token: CHAR.Emu, id: 0 },
    ]);
    board.applyGravityPlans(plans);
    expect(board.grid[1][0]).toBeNull();
    expect(board.grid[7][0]).toBe(CHAR.Emu);
  });

  it("supported pieces produce no gravity plans", () => {
    board.write([cell(2, 7)], CHAR.Rui);
    const plans = board.planGravity([
      { coords: [cell(2, 7)], token: CHAR.Rui, id: 0 },
    ]);
    expect(plans).toEqual([]);
  });
});
