import { describe, expect, it } from "vitest";
import {
  isCompactPointerViewport,
  isFullscreenOn,
  isPortraitWith,
  preferredDefaultDisplayMode,
} from "./display-policy";
import { shouldLockLandscape } from "./display";

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

describe("shouldLockLandscape", () => {
  it("false without matchMedia", () => {
    expect(shouldLockLandscape(undefined)).toBe(false);
  });
  it("true for coarse-pointer phones", () => {
    const mq = (q: string) => ({
      matches: q.includes("pointer: coarse"),
    });
    expect(shouldLockLandscape(mq)).toBe(true);
  });
  it("true for narrow viewports", () => {
    const mq = (q: string) => ({
      matches: q.includes("max-width"),
    });
    expect(shouldLockLandscape(mq)).toBe(true);
  });
  it("false for desktop-like media", () => {
    const mq = () => ({ matches: false });
    expect(shouldLockLandscape(mq)).toBe(false);
  });
});

describe("preferredDefaultDisplayMode", () => {
  it("windowed without matchMedia (desktop/static fallback)", () => {
    expect(preferredDefaultDisplayMode(undefined)).toBe("windowed");
  });
  it("fullscreen on coarse-pointer phones", () => {
    const mq = (q: string) => ({
      matches: q.includes("pointer: coarse"),
    });
    expect(preferredDefaultDisplayMode(mq)).toBe("fullscreen");
  });
  it("fullscreen on narrow viewports", () => {
    const mq = (q: string) => ({
      matches: q.includes("max-width"),
    });
    expect(preferredDefaultDisplayMode(mq)).toBe("fullscreen");
  });
  it("windowed on large desktop media", () => {
    const mq = () => ({ matches: false });
    expect(preferredDefaultDisplayMode(mq)).toBe("windowed");
  });
});

describe("isCompactPointerViewport", () => {
  it("tracks preferredDefaultDisplayMode fullscreen bucket", () => {
    const phone = (q: string) => ({
      matches: q.includes("pointer: coarse"),
    });
    expect(isCompactPointerViewport(phone)).toBe(true);
    expect(isCompactPointerViewport(() => ({ matches: false }))).toBe(false);
    expect(isCompactPointerViewport(undefined)).toBe(false);
  });
});
