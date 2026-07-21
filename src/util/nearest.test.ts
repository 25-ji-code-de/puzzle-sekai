import { describe, expect, it } from "vitest";
import { nearestIndex } from "./nearest";

describe("nearestIndex", () => {
  it("picks the closest value", () => {
    expect(nearestIndex([0, 10, 20], 12)).toBe(1);
    expect(nearestIndex([0, 10, 20], 3)).toBe(0);
    expect(nearestIndex([0, 10, 20], 19)).toBe(2);
  });
  it("ties prefer the earlier index", () => {
    expect(nearestIndex([0, 10], 5)).toBe(0);
  });
  it("single element", () => {
    expect(nearestIndex([42], 0)).toBe(0);
  });
});
