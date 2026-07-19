/**
 * Chain / drop scoring pure helpers.
 */
import "../test/dom-shim";
import { describe, it, expect } from "vitest";
import { CHAIN_MULT_CAP, DROP_SCORE_FACTOR, chainMultiplierOf } from "./model";

describe("chainMultiplierOf", () => {
  it("combo 1 is identity", () => {
    expect(chainMultiplierOf(1)).toBe(1);
    expect(chainMultiplierOf(0)).toBe(1);
  });

  it("grows +0.2 per step", () => {
    expect(chainMultiplierOf(2)).toBeCloseTo(1.2);
    expect(chainMultiplierOf(5)).toBeCloseTo(1.8);
    expect(chainMultiplierOf(10)).toBeCloseTo(2.8);
  });

  it("caps at CHAIN_MULT_CAP", () => {
    expect(chainMultiplierOf(16)).toBe(CHAIN_MULT_CAP);
    expect(chainMultiplierOf(100)).toBe(CHAIN_MULT_CAP);
  });

  it("combo 5 is at least 1.8× combo 1", () => {
    expect(chainMultiplierOf(5) / chainMultiplierOf(1)).toBeGreaterThanOrEqual(
      1.8,
    );
  });
});

describe("DROP_SCORE_FACTOR", () => {
  it("slightly dampens drop contribution (not full weight)", () => {
    expect(DROP_SCORE_FACTOR).toBe(0.6);
  });
});
