/**
 * High-score column cycle cursor math (no storage / i18n).
 */
import { describe, expect, it } from "vitest";
import { nextHighScoreCursor } from "./menu-cursor";

describe("nextHighScoreCursor", () => {
  it("no-ops when list has 0–1 entries", () => {
    expect(nextHighScoreCursor(0, null, 0)).toBeNull();
    expect(nextHighScoreCursor(1, null, 0)).toBeNull();
    expect(nextHighScoreCursor(1, 0, 0)).toBe(0);
  });

  it("from null starts after best index", () => {
    // best at 0 → next 1
    expect(nextHighScoreCursor(3, null, 0)).toBe(1);
    // best at 2 → next 0
    expect(nextHighScoreCursor(3, null, 2)).toBe(0);
    // unknown best → treat as 0 → next 1
    expect(nextHighScoreCursor(3, null, -1)).toBe(1);
  });

  it("increments and wraps", () => {
    expect(nextHighScoreCursor(3, 0, 0)).toBe(1);
    expect(nextHighScoreCursor(3, 1, 0)).toBe(2);
    expect(nextHighScoreCursor(3, 2, 0)).toBe(0);
  });
});
