import { describe, expect, it } from "vitest";
import { safeJsonParse } from "./json";

describe("safeJsonParse", () => {
  it("parses valid JSON", () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    expect(safeJsonParse("[1,2]")).toEqual([1, 2]);
  });
  it("null/empty → fallback", () => {
    expect(safeJsonParse(null)).toBeNull();
    expect(safeJsonParse("")).toBeNull();
    expect(safeJsonParse(undefined, { x: 1 })).toEqual({ x: 1 });
  });
  it("garbage → fallback", () => {
    expect(safeJsonParse("{nope")).toBeNull();
    expect(safeJsonParse("{nope", [])).toEqual([]);
  });
});
