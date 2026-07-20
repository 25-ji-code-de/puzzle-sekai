/**
 * Native deep-link URL helpers (no shell runtime required).
 */
import { describe, it, expect } from "vitest";
import { isOAuthCallbackUrl } from "./deep-link";

describe("isOAuthCallbackUrl", () => {
  it("accepts puzzlesekai auth callback", () => {
    expect(
      isOAuthCallbackUrl("puzzlesekai://auth/callback?code=abc&state=xyz"),
    ).toBe(true);
  });

  it("rejects unrelated schemes / hosts", () => {
    expect(isOAuthCallbackUrl("https://pico.nightcord.de5.net/?code=x")).toBe(
      false,
    );
    expect(isOAuthCallbackUrl("puzzlesekai://other/path")).toBe(false);
    expect(isOAuthCallbackUrl("not-a-url")).toBe(false);
  });
});
