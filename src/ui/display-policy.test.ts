import { describe, expect, it } from "vitest";
import {
  isCompactPointerViewport,
  isFullscreenOn,
  isIPadOS,
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

describe("isIPadOS", () => {
  it("false without hints", () => {
    expect(isIPadOS(undefined)).toBe(false);
  });
  it("true for classic iPad UA", () => {
    expect(
      isIPadOS({
        userAgent:
          "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      }),
    ).toBe(true);
  });
  it("true for iPadOS desktop UA + multi-touch", () => {
    expect(
      isIPadOS({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        platform: "MacIntel",
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });
  it("false for real Mac (no multi-touch)", () => {
    expect(
      isIPadOS({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        platform: "MacIntel",
        maxTouchPoints: 0,
      }),
    ).toBe(false);
  });
  it("false for iPhone", () => {
    expect(
      isIPadOS({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        maxTouchPoints: 5,
      }),
    ).toBe(false);
  });
  it("false for Android tablet", () => {
    expect(
      isIPadOS({
        userAgent:
          "Mozilla/5.0 (Linux; Android 14; SM-X810) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        maxTouchPoints: 5,
      }),
    ).toBe(false);
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
  it("windowed on iPadOS even when coarse-pointer", () => {
    const mq = (q: string) => ({
      matches: q.includes("pointer: coarse"),
    });
    expect(
      preferredDefaultDisplayMode(mq, {
        userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
      }),
    ).toBe("windowed");
  });
  it("fullscreen on Android tablet (coarse pointer, not iPadOS)", () => {
    const mq = (q: string) => ({
      matches: q.includes("pointer: coarse"),
    });
    expect(
      preferredDefaultDisplayMode(mq, {
        userAgent: "Mozilla/5.0 (Linux; Android 14; SM-X810)",
        maxTouchPoints: 5,
      }),
    ).toBe("fullscreen");
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
  it("true for phones and tablets; independent of display-mode default", () => {
    const phone = (q: string) => ({
      matches: q.includes("pointer: coarse"),
    });
    expect(isCompactPointerViewport(phone)).toBe(true);
    expect(isCompactPointerViewport(() => ({ matches: false }))).toBe(false);
    expect(isCompactPointerViewport(undefined)).toBe(false);
  });
});
