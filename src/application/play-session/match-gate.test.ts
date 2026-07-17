/**
 * Match-open gate unit tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { openMatch, closeMatch, isMatchOpen } from "./match-gate";

describe("match-gate", () => {
  beforeEach(() => {
    closeMatch();
  });

  it("starts closed", () => {
    expect(isMatchOpen()).toBe(false);
  });

  it("open/close toggles", () => {
    openMatch();
    expect(isMatchOpen()).toBe(true);
    closeMatch();
    expect(isMatchOpen()).toBe(false);
  });
});
