import { describe, expect, it } from "vitest";
import { prepareLiveMessage, shouldSpeakText } from "./live-region-math";

describe("shouldSpeakText / prepareLiveMessage", () => {
  it("rejects empty / whitespace", () => {
    expect(shouldSpeakText("")).toBe(false);
    expect(shouldSpeakText("   ")).toBe(false);
    expect(prepareLiveMessage("  hi  ")).toBe("hi");
  });
  it("accepts non-empty", () => {
    expect(shouldSpeakText("score 10")).toBe(true);
  });
});
