import { describe, expect, it } from "vitest";
import { colliderSpecFor, massOfKind } from "../colliders";
import { BOX_SIZE } from "../../../config";

describe("massOfKind", () => {
  it("matches cell-equivalent counts", () => {
    expect(massOfKind("cell2")).toBe(2);
    expect(massOfKind("big2x2")).toBe(4);
    expect(massOfKind("item")).toBe(1);
    expect(massOfKind("shrunk")).toBe(1);
  });
});

describe("colliderSpecFor", () => {
  it("cell2 has 1×2 half-extents and offset to geometric center", () => {
    const s = colliderSpecFor("cell2");
    expect(s.halfExtents.x).toBe(BOX_SIZE / 2);
    expect(s.halfExtents.y).toBe(BOX_SIZE);
    expect(s.offset.y).toBe(BOX_SIZE / 2);
    expect(s.mass).toBe(2);
  });

  it("big2x2 is square 2×2 centered", () => {
    const s = colliderSpecFor("big2x2");
    expect(s.halfExtents.x).toBe(BOX_SIZE);
    expect(s.halfExtents.y).toBe(BOX_SIZE);
    expect(s.offset).toEqual({ x: 0, y: 0 });
    expect(s.mass).toBe(4);
  });
});
