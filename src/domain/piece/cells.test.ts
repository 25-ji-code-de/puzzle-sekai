/**
 * Pure cell-list picker tests — no sprites / grid mutation.
 */
import { describe, it, expect } from "vitest";
import {
  cellToXY,
  pickMaxY,
  pickMinY,
  pickMinX,
  pickMaxX,
  bottomCells,
  maxFootprintY,
  translateCells,
} from "./cells";
import { cell } from "../types/cell";

const sample = [cell(1, 3), cell(4, 1), cell(2, 5), cell(0, 5)];

describe("cellToXY", () => {
  it("unpacks branded cell", () => {
    expect(cellToXY(cell(3, 7))).toEqual({ x: 3, y: 7 });
  });
});

describe("pick extremes", () => {
  it("pickMaxY / pickMinY", () => {
    expect(pickMaxY(sample)).toEqual([2, 5]);
    expect(pickMinY(sample)).toEqual([4, 1]);
  });

  it("pickMaxX / pickMinX", () => {
    expect(pickMaxX(sample)).toEqual([4, 1]);
    expect(pickMinX(sample)).toEqual([0, 5]);
  });

  it("ties keep first max / min by reduce order", () => {
    const tiedY = [cell(1, 5), cell(2, 5)];
    expect(pickMaxY(tiedY)).toEqual([1, 5]);
    expect(pickMinY(tiedY)).toEqual([1, 5]);
  });
});

describe("bottomCells / maxFootprintY", () => {
  it("returns all cells on the lowest row", () => {
    expect(bottomCells(sample)).toEqual([
      [2, 5],
      [0, 5],
    ]);
  });

  it("empty footprint → empty bottom, maxY -1", () => {
    expect(bottomCells([])).toEqual([]);
    expect(maxFootprintY([])).toBe(-1);
  });

  it("maxFootprintY is the max row index", () => {
    expect(maxFootprintY(sample)).toBe(5);
  });
});

describe("translateCells", () => {
  it("shifts every cell by (dx, dy)", () => {
    expect(translateCells([cell(1, 2), cell(3, 4)], 2, -1)).toEqual([
      [3, 1],
      [5, 3],
    ]);
  });

  it("zero delta is identity", () => {
    const cells = [cell(0, 0), cell(1, 1)];
    expect(translateCells(cells, 0, 0)).toEqual(cells);
  });
});
