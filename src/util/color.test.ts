import { describe, expect, it } from "vitest";
import { hexToPixi, hexToRgba, parseHexRgb } from "./color";

describe("parseHexRgb", () => {
  it("parses #rrggbb and rrggbb", () => {
    expect(parseHexRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseHexRgb("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
  });
  it("rejects short / garbage", () => {
    expect(parseHexRgb("#fff")).toBeNull();
    expect(parseHexRgb("not")).toBeNull();
    expect(parseHexRgb("")).toBeNull();
  });
});

describe("hexToPixi", () => {
  it("strips #", () => {
    expect(hexToPixi("#ff5577")).toBe(0xff5577);
    expect(hexToPixi("00ff00")).toBe(0x00ff00);
  });
  it("falls back to white", () => {
    expect(hexToPixi("#fff")).toBe(0xffffff);
    expect(hexToPixi("nope")).toBe(0xffffff);
  });
});

describe("hexToRgba", () => {
  it("formats rgba", () => {
    expect(hexToRgba("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
    expect(hexToRgba("00ff00", 1)).toBe("rgba(0, 255, 0, 1)");
  });
  it("null on bad hex", () => {
    expect(hexToRgba("#fff", 1)).toBeNull();
  });
});
