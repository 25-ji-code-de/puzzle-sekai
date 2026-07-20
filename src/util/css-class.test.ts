import { describe, expect, it } from "vitest";
import { joinClassNames } from "./css-class";

describe("joinClassNames", () => {
  it("joins truthy strings", () => {
    expect(joinClassNames("a", "b", "c")).toBe("a b c");
  });
  it("skips false/null/undefined/empty", () => {
    expect(joinClassNames("setting-opt", false, null, "", "active")).toBe(
      "setting-opt active",
    );
  });
  it("collapses extra spaces in tokens", () => {
    expect(joinClassNames("  a  ", "b")).toBe("a b");
  });
});
