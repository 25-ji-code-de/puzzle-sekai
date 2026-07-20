import { describe, expect, it } from "vitest";
import { fnv1a32 } from "./hash";

describe("fnv1a32", () => {
  it("is deterministic", () => {
    expect(fnv1a32("puzzle-sekai")).toBe(fnv1a32("puzzle-sekai"));
  });

  it("diverges for different inputs", () => {
    expect(fnv1a32("a")).not.toBe(fnv1a32("b"));
  });

  it("returns unsigned 32-bit", () => {
    const h = fnv1a32("hello");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(h)).toBe(true);
  });

  it("empty string is FNV offset basis", () => {
    expect(fnv1a32("")).toBe(0x811c9dc5);
  });
});
