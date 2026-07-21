import { describe, expect, it } from "vitest";
import { reducedMotionFromMatches } from "./motion";

describe("reducedMotionFromMatches", () => {
  it("only true is reduced", () => {
    expect(reducedMotionFromMatches(true)).toBe(true);
    expect(reducedMotionFromMatches(false)).toBe(false);
    expect(reducedMotionFromMatches(null)).toBe(false);
    expect(reducedMotionFromMatches(undefined)).toBe(false);
  });
});
