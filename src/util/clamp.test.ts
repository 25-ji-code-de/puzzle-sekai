import { describe, expect, it } from "vitest";
import { clamp, clampInt } from "./clamp";

describe("clampInt", () => {
  it("clamps into range", () => {
    expect(clampInt(0, 1, 7)).toBe(1);
    expect(clampInt(99, 1, 7)).toBe(7);
    expect(clampInt(4, 1, 7)).toBe(4);
  });
  it("truncates toward zero before clamp", () => {
    expect(clampInt(3.9, 1, 7)).toBe(3);
    expect(clampInt(-1.2, 0, 10)).toBe(0);
  });
  it("non-finite → min", () => {
    expect(clampInt(Number.NaN, 1, 7)).toBe(1);
    expect(clampInt(Number.POSITIVE_INFINITY, 1, 7)).toBe(1);
  });
});

describe("clamp", () => {
  it("clamps floats", () => {
    expect(clamp(0.2, 0.45, 1.6)).toBe(0.45);
    expect(clamp(2, 0.45, 1.6)).toBe(1.6);
    expect(clamp(1, 0.45, 1.6)).toBe(1);
  });
});
