import { describe, expect, it } from "vitest";
import { toFiniteNumber, toNonNegInt } from "./number";

describe("toFiniteNumber", () => {
  it("passes through finite numbers", () => {
    expect(toFiniteNumber(3.5)).toBe(3.5);
    expect(toFiniteNumber("12")).toBe(12);
  });
  it("falls back for garbage", () => {
    expect(toFiniteNumber(undefined)).toBe(0);
    expect(toFiniteNumber("x", 7)).toBe(7);
    expect(toFiniteNumber(Number.NaN, -1)).toBe(-1);
    expect(toFiniteNumber(Number.POSITIVE_INFINITY, 1)).toBe(1);
  });
});

describe("toNonNegInt", () => {
  it("floors and floors at zero", () => {
    expect(toNonNegInt(3.9)).toBe(3);
    expect(toNonNegInt(-2)).toBe(0);
    expect(toNonNegInt("10")).toBe(10);
    expect(toNonNegInt("nope", 5)).toBe(5);
  });
});
