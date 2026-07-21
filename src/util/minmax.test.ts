import { describe, expect, it } from "vitest";
import { maxOf, minOf } from "./minmax";

describe("maxOf / minOf", () => {
  it("empty defaults", () => {
    expect(maxOf([])).toBe(Number.NEGATIVE_INFINITY);
    expect(minOf([])).toBe(Number.POSITIVE_INFINITY);
    expect(maxOf([], -1)).toBe(-1);
    expect(minOf([], 99)).toBe(99);
  });
  it("finds extremes", () => {
    expect(maxOf([1, 5, 3])).toBe(5);
    expect(minOf([1, 5, 3])).toBe(1);
    expect(maxOf([-2])).toBe(-2);
  });
});
