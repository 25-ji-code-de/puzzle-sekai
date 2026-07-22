/**
 * Pure touch gesture math (stage units after letterbox conversion).
 */
import { describe, it, expect } from "vitest";
import {
  canSoftDropSteer,
  classifyFlick,
  clientToStageScale,
  clientDeltaToStage,
  consumeGridSteps,
  isTapGesture,
  isWithinDeadZone,
  resolveAxisLock,
  shouldArmSoftDrop,
  shouldReleaseSoftDrop,
} from "./touch-math";
import { BOX_SIZE, touchStageThresholds } from "../config";

const T = touchStageThresholds();

describe("clientToStageScale", () => {
  it("maps CSS box to stage", () => {
    const s = clientToStageScale({ width: 960, height: 540 }, 1920, 1080);
    expect(s.sx).toBe(2);
    expect(s.sy).toBe(2);
  });

  it("falls back safely on zero size", () => {
    const s = clientToStageScale({ width: 0, height: 0 }, 1920, 1080);
    expect(s.sx).toBe(1);
    expect(s.sy).toBe(1);
  });
});

describe("clientDeltaToStage", () => {
  it("scales deltas", () => {
    expect(clientDeltaToStage(10, 20, { sx: 2, sy: 3 })).toEqual({
      dx: 20,
      dy: 60,
    });
  });
});

describe("touchStageThresholds", () => {
  it("derives stage px from cell fractions", () => {
    expect(T.deadZone).toBeCloseTo(BOX_SIZE * 0.2);
    expect(T.gridStep).toBeCloseTo(BOX_SIZE * 0.85);
    expect(T.softDrop).toBeCloseTo(BOX_SIZE * 0.32);
    expect(T.flickMin).toBeCloseTo(BOX_SIZE * 0.55);
  });
});

describe("resolveAxisLock", () => {
  it("stays none inside dead zone", () => {
    expect(resolveAxisLock(5, 5, T.deadZone, 1.45)).toBe("none");
  });

  it("locks horizontal when dx dominates", () => {
    expect(resolveAxisLock(80, 20, T.deadZone, 1.45)).toBe("h");
  });

  it("locks vertical when dy dominates", () => {
    expect(resolveAxisLock(20, 80, T.deadZone, 1.45)).toBe("v");
  });

  it("prefers vertical on ambiguous diagonal", () => {
    expect(resolveAxisLock(40, 38, T.deadZone, 1.45)).toBe("v");
  });
});

describe("consumeGridSteps", () => {
  it("emits steps and keeps remainder", () => {
    expect(consumeGridSteps(150, 80)).toEqual({ steps: 1, remainder: 70 });
    expect(consumeGridSteps(-160, 80)).toEqual({ steps: -2, remainder: 0 });
  });

  it("ignores non-positive step size", () => {
    expect(consumeGridSteps(100, 0).steps).toBe(0);
  });
});

describe("classifyFlick", () => {
  const opts = {
    hardVelocity: 2.6,
    liftVelocity: 2.2,
    minDistance: T.flickMin,
    verticalRatio: 1.8,
  };

  it("hard-drops on fast down flick", () => {
    expect(classifyFlick(3.0, T.flickMin + 10, 10, opts)).toBe("hardDrop");
  });

  it("lifts on fast up flick", () => {
    expect(classifyFlick(-2.5, -(T.flickMin + 10), 5, opts)).toBe("lift");
  });

  it("rejects short or diagonal travel", () => {
    expect(classifyFlick(5, 20, 0, opts)).toBe(null);
    expect(
      classifyFlick(5, T.flickMin + 20, (T.flickMin + 20) / 1.5, opts),
    ).toBe(null);
  });
});

describe("soft drop hysteresis", () => {
  it("arms and releases with threshold", () => {
    expect(shouldArmSoftDrop(T.softDrop, T.softDrop)).toBe(true);
    expect(shouldArmSoftDrop(T.softDrop - 1, T.softDrop)).toBe(false);
    expect(shouldReleaseSoftDrop(T.softDrop * 0.4, T.softDrop)).toBe(true);
    expect(shouldReleaseSoftDrop(T.softDrop * 0.5, T.softDrop)).toBe(false);
  });
});

describe("canSoftDropSteer", () => {
  it("requires extra lateral commitment", () => {
    expect(canSoftDropSteer(T.softSteer, T.softSteer)).toBe(true);
    expect(canSoftDropSteer(T.softSteer - 1, T.softSteer)).toBe(false);
  });
});

describe("isTapGesture", () => {
  it("requires short duration and dead zone", () => {
    expect(isTapGesture(100, 2, 2, T.deadZone, 280)).toBe(true);
    expect(isTapGesture(400, 2, 2, T.deadZone, 280)).toBe(false);
    expect(isTapGesture(100, T.deadZone + 5, 0, T.deadZone, 280)).toBe(false);
  });
});

describe("isWithinDeadZone", () => {
  it("uses independent axes in stage space", () => {
    expect(isWithinDeadZone(T.deadZone, T.deadZone, T.deadZone)).toBe(true);
    expect(isWithinDeadZone(T.deadZone + 1, 0, T.deadZone)).toBe(false);
  });
});
