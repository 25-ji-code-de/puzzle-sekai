import { describe, expect, it } from "vitest";
import { easeInQuad, easeLinear, easeOutQuad } from "./ease";

describe("ease curves", () => {
  it("easeInQuad endpoints and mid", () => {
    expect(easeInQuad(0)).toBe(0);
    expect(easeInQuad(1)).toBe(1);
    expect(easeInQuad(0.5)).toBeCloseTo(0.25);
  });
  it("easeOutQuad endpoints and mid", () => {
    expect(easeOutQuad(0)).toBe(0);
    expect(easeOutQuad(1)).toBe(1);
    expect(easeOutQuad(0.5)).toBeCloseTo(0.75);
  });
  it("easeLinear is identity", () => {
    expect(easeLinear(0.3)).toBe(0.3);
  });
});
