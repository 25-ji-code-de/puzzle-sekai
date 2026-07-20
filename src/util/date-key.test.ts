import { describe, expect, it } from "vitest";
import { formatUtcDateKey, isUtcDateKeyFormat } from "./date-key";

describe("formatUtcDateKey", () => {
  it("zero-pads month and day", () => {
    expect(formatUtcDateKey(new Date(Date.UTC(2026, 0, 5, 12, 0, 0)))).toBe(
      "2026-01-05",
    );
    expect(formatUtcDateKey(new Date(Date.UTC(2026, 6, 19, 0, 0, 0)))).toBe(
      "2026-07-19",
    );
  });
});

describe("isUtcDateKeyFormat", () => {
  it("accepts YYYY-MM-DD only", () => {
    expect(isUtcDateKeyFormat("2026-07-19")).toBe(true);
    expect(isUtcDateKeyFormat("2026-7-19")).toBe(false);
    expect(isUtcDateKeyFormat("")).toBe(false);
    expect(isUtcDateKeyFormat(null)).toBe(false);
  });
});
