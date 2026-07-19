/**
 * Fun-mode flag normalize / multiplier pure tests.
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_FUN_MODES,
  FUN_MODE_DEFS,
  FUN_MODE_IDS,
  getFunModeMultiplier,
  isEntertainmentMode,
  normalizeFunModes,
  scaleItemLinkedFactor,
  type FunModeFlags,
} from "./modes";

describe("normalizeFunModes", () => {
  it("defaults for null / non-object", () => {
    expect(normalizeFunModes(null)).toEqual(DEFAULT_FUN_MODES);
    expect(normalizeFunModes("x")).toEqual(DEFAULT_FUN_MODES);
  });

  it("keeps only known boolean flags", () => {
    const out = normalizeFunModes({
      mikudayo: true,
      unknownMode: true,
      kanadeSlow: "yes",
      emuShrink: false,
    });
    expect(out.mikudayo).toBe(true);
    expect(out.emuShrink).toBe(false);
    expect(out.kanadeSlow).toBe(false);
    expect("unknownMode" in out).toBe(false);
  });

  it("makes physics modes mutually exclusive (prefer cantilever)", () => {
    const out = normalizeFunModes({ cantilever: true, truePhysics: true });
    expect(out.cantilever).toBe(true);
    expect(out.truePhysics).toBe(false);
  });
});

describe("isEntertainmentMode", () => {
  it("false when all off", () => {
    expect(isEntertainmentMode(DEFAULT_FUN_MODES)).toBe(false);
  });

  it("true when any flag is on", () => {
    const flags: FunModeFlags = { ...DEFAULT_FUN_MODES, wonderBlast: true };
    expect(isEntertainmentMode(flags)).toBe(true);
  });
});

describe("scaleItemLinkedFactor", () => {
  it("baseline 10% returns base factor", () => {
    expect(scaleItemLinkedFactor(1.1, 10)).toBeCloseTo(1.1);
    expect(scaleItemLinkedFactor(0.8, 10)).toBeCloseTo(0.8);
  });

  it("0% items pulls factor toward 1", () => {
    expect(scaleItemLinkedFactor(1.2, 0)).toBeCloseTo(1);
    expect(scaleItemLinkedFactor(0.7, 0)).toBeCloseTo(1);
  });

  it("30% clamps weight at 1.5", () => {
    // 1 + (1.1 - 1) * 1.5 = 1.15
    expect(scaleItemLinkedFactor(1.1, 30)).toBeCloseTo(1.15);
    expect(scaleItemLinkedFactor(1.1, 100)).toBeCloseTo(1.15);
  });
});

describe("getFunModeMultiplier", () => {
  it("all off → 1", () => {
    expect(getFunModeMultiplier(DEFAULT_FUN_MODES)).toBe(1);
  });

  it("multiplies enabled non-linked factors", () => {
    const flags: FunModeFlags = {
      ...DEFAULT_FUN_MODES,
      mikudayo: true, // 0.85
      shizukuSwap: true, // 1.15
    };
    expect(getFunModeMultiplier(flags)).toBeCloseTo(0.85 * 1.15);
  });

  it("item-linked factors scale with drop rate", () => {
    const flags: FunModeFlags = {
      ...DEFAULT_FUN_MODES,
      itemAllergy: true, // base 1.1 item-linked
    };
    expect(getFunModeMultiplier(flags, 0)).toBeCloseTo(1);
    expect(getFunModeMultiplier(flags, 10)).toBeCloseTo(1.1);
  });

  it("clamps product into [0.45, 1.6]", () => {
    const allOn = Object.fromEntries(FUN_MODE_IDS.map((id) => [id, true])) as FunModeFlags;
    // physics mutual exclusion is only in normalize — product of raw flags can exceed
    const product = getFunModeMultiplier(allOn, 10);
    expect(product).toBeGreaterThanOrEqual(0.45);
    expect(product).toBeLessThanOrEqual(1.6);
  });

  it("FUN_MODE_DEFS covers every id once", () => {
    expect(FUN_MODE_DEFS).toHaveLength(FUN_MODE_IDS.length);
    expect(new Set(FUN_MODE_DEFS.map((d) => d.id)).size).toBe(FUN_MODE_IDS.length);
  });
});
