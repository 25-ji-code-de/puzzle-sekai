import { describe, expect, it } from "vitest";
import {
  atLeastOne,
  clamp,
  clampInt,
  nonNegative,
  unitInterval,
} from "./clamp";

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

describe("nonNegative", () => {
  it("floors at zero", () => {
    expect(nonNegative(3)).toBe(3);
    expect(nonNegative(-1)).toBe(0);
    expect(nonNegative(Number.NaN)).toBe(0);
  });
});

describe("atLeastOne", () => {
  it("floors at one", () => {
    expect(atLeastOne(3)).toBe(3);
    expect(atLeastOne(0)).toBe(1);
    expect(atLeastOne(-2)).toBe(1);
    expect(atLeastOne(Number.NaN)).toBe(1);
  });
});

describe("unitInterval", () => {
  it("saturates into [0, 1]", () => {
    expect(unitInterval(-1)).toBe(0);
    expect(unitInterval(0.25)).toBe(0.25);
    expect(unitInterval(2)).toBe(1);
    expect(unitInterval(Number.NaN)).toBe(0);
  });
});
