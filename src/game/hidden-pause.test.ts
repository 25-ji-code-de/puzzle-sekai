import { describe, expect, it } from "vitest";
import { hiddenPauseDecision } from "./hidden-pause";

describe("hiddenPauseDecision", () => {
  it("pauses when tab hides during play", () => {
    expect(hiddenPauseDecision("hidden", { type: "playing" }, false)).toEqual({
      action: "pause",
    });
  });

  it("does nothing when already paused / menu / over", () => {
    expect(
      hiddenPauseDecision("hidden", { type: "paused", reason: "user" }, false),
    ).toEqual({ action: "none" });
    expect(hiddenPauseDecision("hidden", { type: "menu" }, false)).toEqual({
      action: "none",
    });
    expect(hiddenPauseDecision("hidden", { type: "gameOver" }, false)).toEqual({
      action: "none",
    });
  });

  it("shows pause menu when returning from hidden pause", () => {
    expect(
      hiddenPauseDecision(
        "visible",
        { type: "paused", reason: "hidden" },
        false,
      ),
    ).toEqual({ action: "showPauseMenu" });
  });

  it("does not re-open menu if already open", () => {
    expect(
      hiddenPauseDecision(
        "visible",
        { type: "paused", reason: "hidden" },
        true,
      ),
    ).toEqual({ action: "none" });
  });

  it("ignores visible when not hidden-paused", () => {
    expect(hiddenPauseDecision("visible", { type: "playing" }, false)).toEqual({
      action: "none",
    });
    expect(
      hiddenPauseDecision("visible", { type: "paused", reason: "user" }, false),
    ).toEqual({ action: "none" });
  });
});
