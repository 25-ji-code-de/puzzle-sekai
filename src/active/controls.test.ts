/**
 * Touch half-screen helper (canvas letterbox-aware).
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("../runtime", () => ({
  app: {
    view: {
      getBoundingClientRect: () => ({
        left: 0,
        width: 100,
        top: 0,
        height: 100,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    },
  },
  hammerManager: {
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock("../fun/effects", () => ({
  isControlsSwapped: () => false,
}));

describe("isLeftHalfOfCanvas", () => {
  it("uses canvas mid-x, not window mid-x", async () => {
    const { isLeftHalfOfCanvas } = await import("./controls");
    // Canvas letterboxed: starts at x=200, width 800 → mid = 600
    const view = {
      getBoundingClientRect: () => ({
        left: 200,
        width: 800,
        top: 0,
        height: 100,
        right: 1000,
        bottom: 100,
        x: 200,
        y: 0,
        toJSON: () => ({}),
      }),
    } as HTMLElement;
    expect(isLeftHalfOfCanvas(500, view)).toBe(true); // left of 600
    expect(isLeftHalfOfCanvas(700, view)).toBe(false); // right of 600
  });

  it("treats exact mid as right half (strict <)", async () => {
    const { isLeftHalfOfCanvas } = await import("./controls");
    const view = {
      getBoundingClientRect: () => ({
        left: 0,
        width: 100,
        top: 0,
        height: 100,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    } as HTMLElement;
    expect(isLeftHalfOfCanvas(50, view)).toBe(false);
    expect(isLeftHalfOfCanvas(49.9, view)).toBe(true);
  });
});
