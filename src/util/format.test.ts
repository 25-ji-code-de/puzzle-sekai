import { describe, expect, it } from "vitest";
import { formatPercent, formatTimesMult } from "./format";

describe("formatTimesMult", () => {
  it("formats × with 2 decimals", () => {
    expect(formatTimesMult(1)).toBe("×1.00");
    expect(formatTimesMult(1.25)).toBe("×1.25");
    expect(formatTimesMult(0)).toBe("×0.00");
  });
  it("non-finite → ×0.00", () => {
    expect(formatTimesMult(Number.NaN)).toBe("×0.00");
  });
});

describe("formatPercent", () => {
  it("rounds and appends %", () => {
    expect(formatPercent(50)).toBe("50%");
    expect(formatPercent(33.6)).toBe("34%");
    expect(formatPercent(Number.NaN)).toBe("0%");
  });
});
