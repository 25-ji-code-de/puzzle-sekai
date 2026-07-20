import { describe, expect, it } from "vitest";
import { manhattan, minManhattanToCells } from "./manhattan";

describe("manhattan", () => {
  it("same cell is 0", () => {
    expect(manhattan(2, 3, 2, 3)).toBe(0);
  });
  it("ortho and diagonal", () => {
    expect(manhattan(0, 0, 3, 0)).toBe(3);
    expect(manhattan(0, 0, 3, 4)).toBe(7);
  });
});

describe("minManhattanToCells", () => {
  it("empty is Infinity", () => {
    expect(minManhattanToCells(0, 0, [])).toBe(Number.POSITIVE_INFINITY);
  });
  it("picks nearest", () => {
    expect(
      minManhattanToCells(0, 0, [
        [5, 0],
        [1, 1],
        [10, 10],
      ]),
    ).toBe(2);
  });
});
