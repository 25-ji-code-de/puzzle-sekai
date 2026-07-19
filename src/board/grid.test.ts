/**
 * Shared grid helper pure tests.
 */
import { describe, it, expect } from "vitest";
import {
  cellKey,
  parseCellKey,
  inBounds,
  manhattan,
  cellsOrthogonallyAdjacent,
  anyPairAdjacent,
  isAdjacentToAny,
  shuffleInPlace,
  DIRS_ORTHO,
  DIRS_SELF_ORTHO,
} from "./grid";

describe("cellKey / parseCellKey", () => {
  it("round-trips coordinates", () => {
    expect(cellKey(3, 7)).toBe("3,7");
    expect(parseCellKey("3,7")).toEqual([3, 7]);
    expect(parseCellKey(cellKey(0, 0))).toEqual([0, 0]);
  });
});

describe("inBounds", () => {
  const grid = [
    [null, null, null],
    [null, null, null],
  ];

  it("accepts interior cells", () => {
    expect(inBounds(grid, 0, 0)).toBe(true);
    expect(inBounds(grid, 2, 1)).toBe(true);
  });

  it("rejects OOB", () => {
    expect(inBounds(grid, -1, 0)).toBe(false);
    expect(inBounds(grid, 0, -1)).toBe(false);
    expect(inBounds(grid, 3, 0)).toBe(false);
    expect(inBounds(grid, 0, 2)).toBe(false);
  });
});

describe("manhattan / adjacency", () => {
  it("manhattan distance", () => {
    expect(manhattan(0, 0, 0, 0)).toBe(0);
    expect(manhattan(1, 2, 3, 5)).toBe(5);
  });

  it("cellsOrthogonallyAdjacent requires distance 1", () => {
    expect(cellsOrthogonallyAdjacent([[1, 1]], [[1, 2]])).toBe(true);
    expect(cellsOrthogonallyAdjacent([[1, 1]], [[2, 2]])).toBe(false);
    expect(cellsOrthogonallyAdjacent([[0, 0]], [[0, 0]])).toBe(false);
  });

  it("anyPairAdjacent scans groups with cells", () => {
    const a = [{ cells: [[0, 0] as [number, number]] }, { cells: undefined }];
    const b = [{ cells: [[1, 0] as [number, number]] }];
    expect(anyPairAdjacent(a, b)).toBe(true);
    expect(anyPairAdjacent([{ cells: [] }], b)).toBe(false);
  });

  it("isAdjacentToAny matches any neighbor", () => {
    expect(
      isAdjacentToAny(
        [
          [2, 2],
          [5, 5],
        ],
        [[2, 3]],
      ),
    ).toBe(true);
    expect(isAdjacentToAny([[2, 2]], [[4, 4]])).toBe(false);
  });
});

describe("direction tables", () => {
  it("ortho has 4 dirs; self+ortho has 5", () => {
    expect(DIRS_ORTHO).toHaveLength(4);
    expect(DIRS_SELF_ORTHO).toHaveLength(5);
    expect(DIRS_SELF_ORTHO).toContainEqual([0, 0]);
  });
});

describe("shuffleInPlace", () => {
  it("is deterministic for a fixed rand sequence", () => {
    let i = 0;
    const seq = [0.9, 0.1, 0.5, 0.2];
    const rand = () => seq[i++ % seq.length]!;
    const a = [1, 2, 3, 4];
    const b = [1, 2, 3, 4];
    expect(shuffleInPlace(a, rand)).toBe(a);
    i = 0;
    shuffleInPlace(b, rand);
    expect(a).toEqual(b);
    expect(new Set(a)).toEqual(new Set([1, 2, 3, 4]));
  });

  it("empty / single-element are fixed points", () => {
    expect(shuffleInPlace([], () => 0.5)).toEqual([]);
    expect(shuffleInPlace([7], () => 0.5)).toEqual([7]);
  });
});
