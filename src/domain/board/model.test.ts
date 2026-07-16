/**
 * Pure domain tests — no PIXI / DOM.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { BoardModel } from "./model";
import { footprintFromPrimary, anchorFromFootprint } from "../piece";
import { CHAR } from "../../characters/ids";
import { ITEM_TOKEN } from "../types";

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

describe("BoardModel.planGravity", () => {
  let board: BoardModel;

  beforeEach(() => {
    board = new BoardModel(6, 8);
  });

  it("drops an unsupported footprint onto the floor", () => {
    // Place a single cell at row 2
    board.write([[3, 2]], CHAR.Ichika);
    const plans = board.planGravity([
      { coords: [[3, 2]], token: CHAR.Ichika, id: 1 },
    ]);
    expect(plans).toHaveLength(1);
    expect(plans[0].dy).toBe(5); // rows 3..7 free → drop 5 to y=7
    expect(plans[0].to).toEqual([[3, 7]]);
    // planGravity must not permanently mutate
    expect(board.grid[2][3]).toBe(CHAR.Ichika);
    expect(board.grid[7][3]).toBeNull();
  });

  it("stacks on top of a lower piece", () => {
    board.write([[1, 7]], ITEM_TOKEN);
    board.write([[1, 3]], CHAR.Saki);
    const plans = board.planGravity([
      { coords: [[1, 3]], token: CHAR.Saki, id: 0 },
    ]);
    expect(plans).toHaveLength(1);
    expect(plans[0].to).toEqual([[1, 6]]); // rest above item at y=7
  });

  it("applyGravityPlans commits dest footprints", () => {
    board.write([[0, 1]], CHAR.Emu);
    const plans = board.planGravity([
      { coords: [[0, 1]], token: CHAR.Emu, id: 0 },
    ]);
    board.applyGravityPlans(plans);
    expect(board.grid[1][0]).toBeNull();
    expect(board.grid[7][0]).toBe(CHAR.Emu);
  });
});
