/**
 * Fun-mode residual / control-swap runtime state tests.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const funModes = {
  kanadeSlow: false,
  shizukuSwap: false,
  mikudayo: false,
  emuShrink: false,
  wonderBlast: false,
  itemAllergy: false,
  mizukiShift: false,
  cantilever: false,
  truePhysics: false,
};

vi.mock("../settings", () => ({
  getCurrentSettings: () => ({ funModes }),
}));

import {
  cancelShizukuSwapIfShihoPresent,
  consumeKanadeSlowForSpawn,
  getKanadeSelfSpeedMult,
  getKanadeSlowResidual,
  isControlsSwapped,
  isFunModeOn,
  onKanadeCleared,
  onKanadeLanded,
  onShihoLanded,
  onShizukuCleared,
  resetFunEffects,
  setControlsSwapped,
} from "./effects";

beforeEach(() => {
  funModes.kanadeSlow = false;
  funModes.shizukuSwap = false;
  resetFunEffects();
});

describe("isFunModeOn", () => {
  it("reads flags from settings", () => {
    expect(isFunModeOn("kanadeSlow")).toBe(false);
    funModes.kanadeSlow = true;
    expect(isFunModeOn("kanadeSlow")).toBe(true);
  });
});

describe("kanade slow residual", () => {
  it("no-ops when mode off", () => {
    onKanadeLanded();
    expect(getKanadeSlowResidual()).toBe(1);
    expect(getKanadeSelfSpeedMult()).toBe(1);
    expect(consumeKanadeSlowForSpawn()).toBe(1);
  });

  it("lands at 0.5 and decays toward 1 each spawn", () => {
    funModes.kanadeSlow = true;
    expect(getKanadeSelfSpeedMult()).toBe(0.5);
    onKanadeLanded();
    expect(getKanadeSlowResidual()).toBe(0.5);
    expect(consumeKanadeSlowForSpawn()).toBe(0.5);
    expect(getKanadeSlowResidual()).toBeCloseTo(0.6);
    expect(consumeKanadeSlowForSpawn()).toBeCloseTo(0.6);
    expect(getKanadeSlowResidual()).toBeCloseTo(0.7);
  });

  it("clear resets residual immediately", () => {
    funModes.kanadeSlow = true;
    onKanadeLanded();
    onKanadeCleared();
    expect(getKanadeSlowResidual()).toBe(1);
  });

  it("decays to 1 and stays capped (no overshoot)", () => {
    funModes.kanadeSlow = true;
    onKanadeLanded();
    // 0.5 → 0.6 → … → 1.0 over five consumptions after land
    for (let i = 0; i < 6; i++) consumeKanadeSlowForSpawn();
    expect(getKanadeSlowResidual()).toBe(1);
    expect(consumeKanadeSlowForSpawn()).toBe(1);
    expect(getKanadeSlowResidual()).toBe(1);
  });

  it("re-landing Kanade refreshes residual to 0.5 mid-decay", () => {
    funModes.kanadeSlow = true;
    onKanadeLanded();
    consumeKanadeSlowForSpawn(); // residual → 0.6
    onKanadeLanded();
    expect(getKanadeSlowResidual()).toBe(0.5);
  });
});

describe("shizuku control swap", () => {
  it("requires mode on to arm", () => {
    onShizukuCleared(false);
    expect(isControlsSwapped()).toBe(false);
    setControlsSwapped(true);
    expect(isControlsSwapped()).toBe(false);

    funModes.shizukuSwap = true;
    onShizukuCleared(false);
    expect(isControlsSwapped()).toBe(true);
  });

  it("does not arm when Shiho is already on board", () => {
    funModes.shizukuSwap = true;
    onShizukuCleared(true);
    expect(isControlsSwapped()).toBe(false);
  });

  it("Shiho land / cancel clears swap", () => {
    funModes.shizukuSwap = true;
    setControlsSwapped(true);
    expect(isControlsSwapped()).toBe(true);
    onShihoLanded();
    expect(isControlsSwapped()).toBe(false);

    setControlsSwapped(true);
    cancelShizukuSwapIfShihoPresent(true);
    expect(isControlsSwapped()).toBe(false);
  });
});
