import { describe, expect, it } from "vitest";
import { nextTabIndex, shouldWrapTab } from "./focus-trap-math";

describe("shouldWrapTab", () => {
  it("empty list always wraps", () => {
    expect(shouldWrapTab(0, -1, false)).toBe(true);
  });
  it("wraps at edges", () => {
    expect(shouldWrapTab(3, 0, true)).toBe(true);
    expect(shouldWrapTab(3, 2, false)).toBe(true);
    expect(shouldWrapTab(3, 1, false)).toBe(false);
    expect(shouldWrapTab(3, 1, true)).toBe(false);
  });
  it("wraps when active is outside list", () => {
    expect(shouldWrapTab(3, -1, false)).toBe(true);
  });
});

describe("nextTabIndex", () => {
  it("null on empty", () => {
    expect(nextTabIndex(0, 0, false)).toBeNull();
  });
  it("single element stays 0", () => {
    expect(nextTabIndex(1, 0, false)).toBe(0);
    expect(nextTabIndex(1, 0, true)).toBe(0);
  });
  it("forward wraps last→first", () => {
    expect(nextTabIndex(3, 2, false)).toBe(0);
    expect(nextTabIndex(3, 0, false)).toBe(1);
  });
  it("backward wraps first→last", () => {
    expect(nextTabIndex(3, 0, true)).toBe(2);
    expect(nextTabIndex(3, 2, true)).toBe(1);
  });
});
