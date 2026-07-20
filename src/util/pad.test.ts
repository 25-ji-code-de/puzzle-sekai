import { describe, expect, it } from "vitest";
import { padStartDigits, splitPaddedDigits } from "./pad";

describe("padStartDigits", () => {
  it("pads non-negative floors", () => {
    expect(padStartDigits(42, 4)).toBe("0042");
    expect(padStartDigits(-3, 3)).toBe("000");
    expect(padStartDigits(3.9, 2)).toBe("03");
  });
});

describe("splitPaddedDigits", () => {
  it("splits leading zeros from significant digits", () => {
    expect(splitPaddedDigits(42, 6)).toEqual({ pad: "0000", solid: "42" });
    expect(splitPaddedDigits(0, 4)).toEqual({ pad: "000", solid: "0" });
    expect(splitPaddedDigits(1000, 4)).toEqual({ pad: "", solid: "1000" });
  });
});
