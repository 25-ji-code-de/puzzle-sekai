import { describe, expect, it } from "vitest";
import { isFullscreenOn, isPortraitWith } from "./display-policy";

describe("isPortraitWith", () => {
  it("false without matchMedia", () => {
    expect(isPortraitWith(undefined)).toBe(false);
  });
  it("reads orientation: portrait query", () => {
    const mq = (q: string) => ({
      matches: q.includes("portrait"),
    });
    expect(isPortraitWith(mq)).toBe(true);
    expect(
      isPortraitWith(() => {
        throw new Error("boom");
      }),
    ).toBe(false);
  });
});

describe("isFullscreenOn", () => {
  it("false for null / empty", () => {
    expect(isFullscreenOn(null)).toBe(false);
    expect(isFullscreenOn({})).toBe(false);
  });
  it("true for any vendor fullscreen element", () => {
    const el = {} as Element;
    expect(isFullscreenOn({ fullscreenElement: el })).toBe(true);
    expect(isFullscreenOn({ webkitFullscreenElement: el })).toBe(true);
    expect(isFullscreenOn({ msFullscreenElement: el })).toBe(true);
  });
});
