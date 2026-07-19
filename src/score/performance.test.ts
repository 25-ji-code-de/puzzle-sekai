/**
 * Pure effective-score tests — no DOM / PIXI.
 */
import { describe, it, expect } from "vitest";
import {
  ENDLESS_DURATION_MAX,
  ENDLESS_DURATION_MIN,
  PERFORMANCE_BASELINE_SECONDS,
  effectiveScore,
} from "./performance";

describe("effectiveScore multiplier strip", () => {
  it("divides by multiplier", () => {
    expect(
      effectiveScore({
        score: 3500,
        multiplier: 1.75,
        mode: "endless",
        playedSeconds: 90,
      }),
    ).toBeCloseTo(2000);
  });

  it("guards non-positive multiplier", () => {
    expect(
      effectiveScore({ score: 1000, multiplier: 0, mode: "endless" }),
    ).toBeCloseTo(1000 / 0.01);
  });

  it("guards non-finite / negative score", () => {
    expect(
      effectiveScore({ score: Number.NaN, multiplier: 1, mode: "endless" }),
    ).toBe(0);
    expect(
      effectiveScore({ score: -50, multiplier: 1, mode: "endless" }),
    ).toBe(0);
  });
});

describe("effectiveScore time attack", () => {
  it("normalizes to 90s baseline", () => {
    const base = effectiveScore({
      score: 3000,
      multiplier: 1,
      mode: "timeAttack",
      timeAttackDuration: 90,
    });
    expect(base).toBeCloseTo(3000);

    expect(
      effectiveScore({
        score: 3000,
        multiplier: 1,
        mode: "timeAttack",
        timeAttackDuration: 60,
      }),
    ).toBeCloseTo(4500);

    expect(
      effectiveScore({
        score: 3000,
        multiplier: 1,
        mode: "timeAttack",
        timeAttackDuration: 180,
      }),
    ).toBeCloseTo(1500);
  });

  it("defaults missing duration to 90", () => {
    expect(
      effectiveScore({
        score: 3000,
        multiplier: 1,
        mode: "timeAttack",
      }),
    ).toBeCloseTo(3000);
  });
});

describe("effectiveScore endless density", () => {
  it("normalizes playedSeconds to 90s baseline", () => {
    // same raw score over 180s → half density
    expect(
      effectiveScore({
        score: 6000,
        multiplier: 1,
        mode: "endless",
        playedSeconds: 180,
      }),
    ).toBeCloseTo(3000);

    expect(
      effectiveScore({
        score: 3000,
        multiplier: 1,
        mode: "endless",
        playedSeconds: 90,
      }),
    ).toBeCloseTo(3000);
  });

  it("clamps short sessions to min duration", () => {
    // 10s would be ×9 without clamp; with min 30 → ×3
    expect(
      effectiveScore({
        score: 1000,
        multiplier: 1,
        mode: "endless",
        playedSeconds: 10,
      }),
    ).toBeCloseTo(1000 * (PERFORMANCE_BASELINE_SECONDS / ENDLESS_DURATION_MIN));
  });

  it("clamps long sessions to max duration", () => {
    expect(
      effectiveScore({
        score: 100_000,
        multiplier: 1,
        mode: "endless",
        playedSeconds: 10_000,
      }),
    ).toBeCloseTo(
      100_000 * (PERFORMANCE_BASELINE_SECONDS / ENDLESS_DURATION_MAX),
    );
  });

  it("defaults missing playedSeconds to 90", () => {
    expect(
      effectiveScore({
        score: 3000,
        multiplier: 1,
        mode: "endless",
      }),
    ).toBeCloseTo(3000);
  });

  it("ignores playedSeconds on time attack", () => {
    expect(
      effectiveScore({
        score: 3000,
        multiplier: 1,
        mode: "timeAttack",
        timeAttackDuration: 90,
        playedSeconds: 30,
      }),
    ).toBeCloseTo(3000);
  });
});
