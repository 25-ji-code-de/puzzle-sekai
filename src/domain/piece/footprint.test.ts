/**
 * Footprint geometry pure tests — primary ↔ cells ↔ orient.
 */
import { describe, it, expect } from "vitest";
import {
  footprintFromPrimary,
  anchorFromFootprint,
  orientFromFootprint,
} from "./footprint";
import { cell } from "../types/cell";

describe("footprintFromPrimary", () => {
  it("item / shrunk occupy only the primary cell", () => {
    expect(footprintFromPrimary({ x: 3, y: 4 }, 0, "item")).toEqual([
      [3, 4],
    ]);
    expect(footprintFromPrimary({ x: 1, y: 2 }, 2, "shrunk")).toEqual([
      [1, 2],
    ]);
  });

  it("big2x2 primary is bottom-right of four cells", () => {
    expect(footprintFromPrimary({ x: 4, y: 5 }, 0, "big2x2")).toEqual([
      [4, 5],
      [3, 5],
      [4, 4],
      [3, 4],
    ]);
  });

  it("cell2 covers all four orientations from primary", () => {
    expect(footprintFromPrimary({ x: 2, y: 5 }, 0, "cell2")).toEqual([
      [2, 5],
      [2, 4],
    ]);
    expect(footprintFromPrimary({ x: 2, y: 5 }, 1, "cell2")).toEqual([
      [2, 5],
      [3, 5],
    ]);
    expect(footprintFromPrimary({ x: 2, y: 4 }, 2, "cell2")).toEqual([
      [2, 4],
      [2, 5],
    ]);
    expect(footprintFromPrimary({ x: 2, y: 5 }, 3, "cell2")).toEqual([
      [2, 5],
      [1, 5],
    ]);
  });
});

describe("anchorFromFootprint", () => {
  it("round-trips primary for each cell2 orientation", () => {
    for (const orient of [0, 1, 2, 3] as const) {
      const primary =
        orient === 2 ? { x: 2, y: 4 } : { x: 2, y: 5 };
      const cells = footprintFromPrimary(primary, orient, "cell2");
      expect(anchorFromFootprint(cells, "cell2", orient)).toEqual(primary);
    }
  });

  it("non-cell2 / single-cell uses max x/y", () => {
    const big = footprintFromPrimary({ x: 3, y: 5 }, 0, "big2x2");
    expect(anchorFromFootprint(big, "big2x2")).toEqual({ x: 3, y: 5 });
    expect(anchorFromFootprint([cell(1, 2)], "item")).toEqual({ x: 1, y: 2 });
  });

  it("empty footprint → origin primary", () => {
    expect(anchorFromFootprint([], "cell2")).toEqual({ x: 0, y: 0 });
  });
});

describe("orientFromFootprint", () => {
  it("vertical cell2 → 0, horizontal → 1", () => {
    expect(
      orientFromFootprint(
        footprintFromPrimary({ x: 2, y: 5 }, 0, "cell2"),
        "cell2",
      ),
    ).toBe(0);
    expect(
      orientFromFootprint(
        footprintFromPrimary({ x: 2, y: 5 }, 1, "cell2"),
        "cell2",
      ),
    ).toBe(1);
    // head-up still vertical → canonical 0
    expect(
      orientFromFootprint(
        footprintFromPrimary({ x: 2, y: 4 }, 2, "cell2"),
        "cell2",
      ),
    ).toBe(0);
  });

  it("non-cell2 or short footprint → 0", () => {
    expect(orientFromFootprint([cell(0, 0)], "item")).toBe(0);
    expect(orientFromFootprint([cell(0, 0)], "cell2")).toBe(0);
    expect(
      orientFromFootprint(
        footprintFromPrimary({ x: 2, y: 3 }, 0, "big2x2"),
        "big2x2",
      ),
    ).toBe(0);
  });
});
