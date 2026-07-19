/**
 * Continuous-space AABB / gap pure tests.
 * (filename avoids clashing with other dynamics suites)
 */
import { describe, it, expect } from "vitest";
import { aabbGap, poseAabb, poseAabbFromPoints } from "../pose";
import { BOX_SIZE } from "../../../config";

describe("poseAabbFromPoints", () => {
  it("identity pose keeps local bounds", () => {
    const aabb = poseAabbFromPoints(
      [
        { x: -1, y: -2 },
        { x: 3, y: -2 },
        { x: 3, y: 4 },
        { x: -1, y: 4 },
      ],
      { x: 10, y: 20, rotation: 0 },
    );
    expect(aabb).toEqual({ minX: 9, minY: 18, maxX: 13, maxY: 24 });
  });

  it("applies translation and 90° rotation", () => {
    const aabb = poseAabbFromPoints(
      [
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
      ],
      { x: 0, y: 0, rotation: Math.PI / 2 },
    );
    expect(aabb.minX).toBeCloseTo(-1);
    expect(aabb.maxX).toBeCloseTo(1);
    expect(aabb.minY).toBeCloseTo(-1);
    expect(aabb.maxY).toBeCloseTo(1);
  });
});

describe("poseAabb", () => {
  it("item cuboid is 1×1 centered on pose", () => {
    const aabb = poseAabb("item", { x: 100, y: 200, rotation: 0 });
    expect(aabb.minX).toBeCloseTo(100 - BOX_SIZE / 2);
    expect(aabb.maxX).toBeCloseTo(100 + BOX_SIZE / 2);
    expect(aabb.minY).toBeCloseTo(200 - BOX_SIZE / 2);
    expect(aabb.maxY).toBeCloseTo(200 + BOX_SIZE / 2);
  });

  it("prefers local hull points when provided", () => {
    const aabb = poseAabb(
      "item",
      { x: 0, y: 0, rotation: 0 },
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 5 },
      ],
    );
    expect(aabb).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 5 });
  });
});

describe("aabbGap", () => {
  it("0 when overlapping", () => {
    const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    const b = { minX: 5, minY: 5, maxX: 15, maxY: 15 };
    expect(aabbGap(a, b)).toBe(0);
  });

  it("horizontal separation", () => {
    const a = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    const b = { minX: 14, minY: 0, maxX: 20, maxY: 10 };
    expect(aabbGap(a, b)).toBe(4);
  });

  it("diagonal separation uses hypot", () => {
    const a = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    const b = { minX: 4, minY: 5, maxX: 6, maxY: 7 };
    expect(aabbGap(a, b)).toBeCloseTo(Math.hypot(3, 4));
  });
});
