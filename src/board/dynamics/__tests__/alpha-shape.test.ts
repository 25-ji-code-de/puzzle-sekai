import { describe, expect, it } from "vitest";
import { convexHull } from "../alpha-shape";

describe("convexHull", () => {
  it("returns triangle for 3 non-colinear points", () => {
    const h = convexHull([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 2 },
    ]);
    expect(h).toHaveLength(3);
  });

  it("drops interior points", () => {
    const h = convexHull([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
      { x: 2, y: 2 }, // interior
    ]);
    expect(h).toHaveLength(4);
    expect(h.some((p) => p.x === 2 && p.y === 2)).toBe(false);
  });

  it("handles duplicates", () => {
    const h = convexHull([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]);
    expect(h.length).toBeGreaterThanOrEqual(3);
  });
});
