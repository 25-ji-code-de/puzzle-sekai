/**
 * Play-phase predicate tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  getPlayPhase,
  setPlayPhase,
  isPlayActive,
  isPlayingPhase,
  isPausedPhase,
  isGameOverPhase,
  type PlayPhase,
} from "./phase";

describe("play phase", () => {
  beforeEach(() => {
    setPlayPhase({ type: "boot" });
  });

  it("starts at boot and setPlayPhase updates", () => {
    expect(getPlayPhase()).toEqual({ type: "boot" });
    setPlayPhase({ type: "menu" });
    expect(getPlayPhase()).toEqual({ type: "menu" });
  });

  it("isPlayActive for playing and paused only", () => {
    const playing: PlayPhase = { type: "playing", mode: "endless" };
    const paused: PlayPhase = {
      type: "paused",
      reason: "user",
      mode: "timeAttack",
    };
    const over: PlayPhase = {
      type: "gameOver",
      cause: "topOut",
      mode: "endless",
    };
    expect(isPlayActive(playing)).toBe(true);
    expect(isPlayActive(paused)).toBe(true);
    expect(isPlayActive(over)).toBe(false);
    expect(isPlayActive({ type: "menu" })).toBe(false);
  });

  it("typed predicates", () => {
    const playing: PlayPhase = { type: "playing", mode: "endless" };
    const paused: PlayPhase = {
      type: "paused",
      reason: "portrait",
      mode: "endless",
    };
    const over: PlayPhase = {
      type: "gameOver",
      cause: "timeUp",
      mode: "timeAttack",
    };
    expect(isPlayingPhase(playing)).toBe(true);
    expect(isPlayingPhase(paused)).toBe(false);
    expect(isPausedPhase(paused)).toBe(true);
    expect(isGameOverPhase(over)).toBe(true);
    expect(isGameOverPhase(playing)).toBe(false);
  });

  it("predicates default to the module phase", () => {
    setPlayPhase({ type: "playing", mode: "endless" });
    expect(isPlayingPhase()).toBe(true);
    expect(isPlayActive()).toBe(true);
    setPlayPhase({ type: "idle" });
    expect(isPlayActive()).toBe(false);
  });
});
