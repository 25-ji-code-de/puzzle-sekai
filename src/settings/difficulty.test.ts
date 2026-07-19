/**
 * Difficulty level / score multiplier pure tests.
 */
import "../test/dom-shim";
import { describe, it, expect } from "vitest";
import {
  getBaseScoreMultiplier,
  getDifficultyColor,
  getDifficultyCssColor,
  getDifficultyLevel,
  getFinalScoreMultiplier,
  getItemDropChance,
  getScoreMultiplier,
  getScoreMultiplierBreakdown,
  getSpawnRotation,
  getSpeedMultiplier,
  hexToPixi,
  isEntertainmentMode,
  APPEND_GRADIENT,
  DIFFICULTY_COLORS,
} from "./difficulty";
import {
  DEFAULT_SETTINGS,
  type GameSettings,
  type GroupName,
} from "./types";
import { DEFAULT_FUN_MODES } from "../fun/modes";

const settings = (partial: Partial<GameSettings> = {}): GameSettings => ({
  ...DEFAULT_SETTINGS,
  funModes: { ...DEFAULT_FUN_MODES },
  selectedGroups: [...DEFAULT_SETTINGS.selectedGroups],
  ...partial,
});

const threeGroups = DEFAULT_SETTINGS.selectedGroups.slice(0, 3) as GroupName[];
const fiveGroups = [...DEFAULT_SETTINGS.selectedGroups] as GroupName[];

describe("getSpeedMultiplier", () => {
  it("maps speed levels", () => {
    expect(getSpeedMultiplier(settings({ speedLevel: 1 }))).toBe(0.6);
    expect(getSpeedMultiplier(settings({ speedLevel: 2 }))).toBe(1.0);
    expect(getSpeedMultiplier(settings({ speedLevel: 5 }))).toBe(3.0);
  });
});

describe("getDifficultyLevel", () => {
  it("speed + (groups - 3), clamped 1–7", () => {
    // speed 2 + 0 groups-extra = 2
    expect(getDifficultyLevel(settings({ speedLevel: 2, selectedGroups: threeGroups }))).toBe(2);
    // speed 2 + 2 = 4
    expect(getDifficultyLevel(settings({ speedLevel: 2, selectedGroups: fiveGroups }))).toBe(4);
    // speed 5 + 2 = 7
    expect(getDifficultyLevel(settings({ speedLevel: 5, selectedGroups: fiveGroups }))).toBe(7);
    // speed 1 + 0 = 1
    expect(getDifficultyLevel(settings({ speedLevel: 1, selectedGroups: threeGroups }))).toBe(1);
  });

  it("clamps group count into 3–5 for the formula", () => {
    // 2 groups treated as 3 → speed 3 + 0 = 3
    expect(
      getDifficultyLevel(
        settings({
          speedLevel: 3,
          selectedGroups: threeGroups.slice(0, 2) as GroupName[],
        }),
      ),
    ).toBe(3);
  });
});

describe("difficulty colors", () => {
  it("has a color for every level 1–7", () => {
    for (let d = 1; d <= 7; d++) {
      expect(DIFFICULTY_COLORS[d as 1 | 2 | 3 | 4 | 5 | 6 | 7]).toMatch(
        /^#[0-9a-f]{6}$/i,
      );
    }
  });

  it("Append (7) uses gradient css, flat fallback pink", () => {
    expect(getDifficultyCssColor(7)).toBe(APPEND_GRADIENT);
    expect(getDifficultyColor(7)).toBe("#ff88cc");
    expect(getDifficultyColor(99)).toBe("#ffffff");
  });

  it("hexToPixi strips #", () => {
    expect(hexToPixi("#ff5577")).toBe(0xff5577);
  });
});

describe("score multipliers", () => {
  it("base scales with difficulty ~0.55 … ~3.0", () => {
    const d1 = getBaseScoreMultiplier(
      settings({ speedLevel: 1, selectedGroups: threeGroups }),
    );
    const d4 = getBaseScoreMultiplier(
      settings({ speedLevel: 2, selectedGroups: fiveGroups }),
    );
    const d7 = getBaseScoreMultiplier(
      settings({ speedLevel: 5, selectedGroups: fiveGroups }),
    );
    expect(d1).toBeCloseTo(0.55);
    expect(d4).toBeCloseTo(1.5);
    expect(d7).toBeCloseTo(3.0);
  });

  it("final mult clamps into [0.3, 4]", () => {
    const mult = getFinalScoreMultiplier(settings());
    expect(mult).toBeGreaterThanOrEqual(0.3);
    expect(mult).toBeLessThanOrEqual(4);
    expect(getScoreMultiplier(settings())).toBe(mult);
  });

  it("upright orientation lowers mult vs inverted", () => {
    const inverted = getFinalScoreMultiplier(
      settings({ spawnOrientation: "inverted" }),
    );
    const upright = getFinalScoreMultiplier(
      settings({ spawnOrientation: "upright" }),
    );
    expect(upright).toBeLessThan(inverted);
  });

  it("higher item drop rate raises mult (harder clutter)", () => {
    const none = getFinalScoreMultiplier(settings({ itemDropRate: 0 }));
    const high = getFinalScoreMultiplier(settings({ itemDropRate: 30 }));
    expect(high).toBeGreaterThan(none);
  });
});

describe("isEntertainmentMode / item chance / spawn rotation", () => {
  it("entertainment mirrors fun flags", () => {
    expect(isEntertainmentMode(settings())).toBe(false);
    expect(
      isEntertainmentMode(
        settings({ funModes: { ...DEFAULT_FUN_MODES, mikudayo: true } }),
      ),
    ).toBe(true);
  });

  it("item drop chance is percent / 100", () => {
    expect(getItemDropChance(settings({ itemDropRate: 0 }))).toBe(0);
    expect(getItemDropChance(settings({ itemDropRate: 15 }))).toBe(0.15);
  });

  it("spawn rotation 0 upright, π inverted", () => {
    expect(getSpawnRotation(settings({ spawnOrientation: "upright" }))).toBe(0);
    expect(getSpawnRotation(settings({ spawnOrientation: "inverted" }))).toBe(
      Math.PI,
    );
  });
});

describe("getScoreMultiplierBreakdown", () => {
  it("always includes difficulty + item + orientation lines", () => {
    const b = getScoreMultiplierBreakdown(settings());
    expect(b.lines.length).toBeGreaterThanOrEqual(3);
    expect(b.lines[0]!.factor).toBeCloseTo(b.base);
    expect(b.lines[1]!.factor).toBeCloseTo(b.item);
    expect(b.lines[2]!.factor).toBeCloseTo(b.orientation);
    expect(b.final).toBeCloseTo(
      Math.min(4, Math.max(0.3, b.base * b.fun * b.item * b.orientation)),
    );
  });

  it("adds a line per enabled fun mode; item-linked scales with drop rate", () => {
    const off = getScoreMultiplierBreakdown(settings());
    const on = getScoreMultiplierBreakdown(
      settings({
        itemDropRate: 10,
        funModes: {
          ...DEFAULT_FUN_MODES,
          mikudayo: true, // 0.88 non-linked
          itemAllergy: true, // 1.12 item-linked @ 10% → 1.12
        },
      }),
    );
    expect(on.lines.length).toBe(off.lines.length + 2);
    const factors = on.lines.slice(3).map((l) => l.factor);
    expect(factors).toContain(0.88);
    expect(factors.some((f) => Math.abs(f - 1.12) < 1e-9)).toBe(true);
    expect(on.fun).toBeCloseTo(0.88 * 1.12);
  });

  it("final clamps into [0.3, 4]", () => {
    const soft = getScoreMultiplierBreakdown(
      settings({
        speedLevel: 1,
        selectedGroups: threeGroups,
        itemDropRate: 0,
        spawnOrientation: "upright",
        funModes: {
          ...DEFAULT_FUN_MODES,
          mikudayo: true,
          kanadeSlow: true,
          wonderBlast: true,
        },
      }),
    );
    expect(soft.final).toBeGreaterThanOrEqual(0.3);
    expect(soft.final).toBeLessThanOrEqual(4);

    const hard = getScoreMultiplierBreakdown(
      settings({
        speedLevel: 5,
        selectedGroups: fiveGroups,
        itemDropRate: 30,
        spawnOrientation: "inverted",
        funModes: {
          ...DEFAULT_FUN_MODES,
          truePhysics: true,
          shizukuSwap: true,
          emuShrink: true,
        },
      }),
    );
    expect(hard.final).toBeGreaterThanOrEqual(0.3);
    expect(hard.final).toBeLessThanOrEqual(4);
  });
});
