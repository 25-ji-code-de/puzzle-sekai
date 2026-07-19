/**
 * Pure dan rating tests — no DOM / PIXI.
 */
import { describe, it, expect } from "vitest";
import {
  comboBonusOf,
  compareDan,
  computeDanRating,
  danColorStyle,
  danFromTotal,
  danOrnament,
  difficultyWeight,
  getDanColor,
  getDanCssColor,
  getDanGlow,
  isSOrAbove,
  legacyEffectiveFromRaw,
  runRating,
  sStreakOf,
  streakBonusOf,
  DAN_IDS,
  DAN_ORNAMENT,
  DAN_SHIN_HIDEN_GRADIENT,
  type DanRunEntry,
} from "./dan";
import type { ScoreRank } from "./rank";

const entry = (
  rating: number,
  rank: ScoreRank,
  playedAt: number,
): DanRunEntry => ({
  id: `${playedAt}`,
  playedAt,
  mode: "endless",
  score: rating,
  maxCombo: 10,
  difficulty: 3,
  entertainment: false,
  multiplier: 1,
  scoreRank: rank,
  rating,
});

describe("runRating", () => {
  it("applies mild difficulty weight on effective", () => {
    expect(runRating({ effectiveScore: 1000, difficulty: 3 })).toBe(1000);
    expect(runRating({ effectiveScore: 1000, difficulty: 4 })).toBe(1020);
    expect(runRating({ effectiveScore: 1000, difficulty: 7 })).toBe(1120);
    expect(runRating({ effectiveScore: 1000, difficulty: 1 })).toBe(950);
  });

  it("applies entertainment discount", () => {
    expect(
      runRating({
        effectiveScore: 1000,
        difficulty: 3,
        entertainment: true,
      }),
    ).toBe(900);
  });

  it("rejects non-positive effective", () => {
    expect(runRating({ effectiveScore: 0, difficulty: 4 })).toBe(0);
    expect(runRating({ effectiveScore: -10, difficulty: 4 })).toBe(0);
  });

  it("same effective under different mult is equal (caller strips mult)", () => {
    // Callers pass effective = score/mult; raw 3000@×3 and 1000@×1 → same.
    const a = runRating({ effectiveScore: 1000, difficulty: 4 });
    const b = runRating({ effectiveScore: 3000 / 3, difficulty: 4 });
    expect(a).toBe(b);
  });
});

describe("legacyEffectiveFromRaw", () => {
  it("divides score by mult", () => {
    expect(legacyEffectiveFromRaw(3500, 1.75)).toBeCloseTo(2000);
    expect(legacyEffectiveFromRaw(0, 2)).toBe(0);
  });
});

describe("danFromTotal thresholds", () => {
  it("maps boundaries", () => {
    expect(danFromTotal(0)).toBe("none");
    expect(danFromTotal(24_999)).toBe("none");
    expect(danFromTotal(25_000)).toBe("beginner");
    expect(danFromTotal(70_000)).toBe("intermediate");
    expect(danFromTotal(140_000)).toBe("advanced");
    expect(danFromTotal(240_000)).toBe("expert");
    expect(danFromTotal(400_000)).toBe("kaiden");
    expect(danFromTotal(650_000)).toBe("hiden");
    expect(danFromTotal(950_000)).toBe("shinKaiden");
    expect(danFromTotal(1_400_000)).toBe("shinHiden");
    expect(danFromTotal(2_100_000)).toBe("gokuden");
  });
});

describe("B30 / R10 / A", () => {
  it("sums best 30 and recent 10; pads missing with 0", () => {
    const runs = Array.from({ length: 5 }, (_, i) =>
      entry(1000 * (i + 1), "A", i + 1),
    );
    // ratings: 1000,2000,3000,4000,5000
    const r = computeDanRating(runs, 0);
    expect(r.b30).toBe(1000 + 2000 + 3000 + 4000 + 5000);
    expect(r.r10).toBe(r.b30);
    expect(r.a).toBe(0);
    expect(r.total).toBe(r.b30 + r.r10);
  });

  it("B30 prefers highest ratings; R10 prefers newest", () => {
    const runs: DanRunEntry[] = [];
    for (let i = 0; i < 40; i++) {
      runs.push(entry(i + 1, "B", i + 1));
    }
    const r = computeDanRating(runs, 0);
    // best 30 of 1..40 = 11..40
    const expectedB30 = Array.from({ length: 30 }, (_, i) => 11 + i).reduce(
      (a, b) => a + b,
      0,
    );
    // recent 10 = 31..40
    const expectedR10 = Array.from({ length: 10 }, (_, i) => 31 + i).reduce(
      (a, b) => a + b,
      0,
    );
    expect(r.b30).toBe(expectedB30);
    expect(r.r10).toBe(expectedR10);
  });

  it("combo and streak bonuses cap at new limits", () => {
    expect(comboBonusOf(50)).toBe(2500);
    expect(comboBonusOf(800)).toBe(40_000);
    expect(comboBonusOf(9999)).toBe(40_000);
    expect(streakBonusOf(5)).toBe(7500);
    expect(streakBonusOf(40)).toBe(60_000);
    expect(streakBonusOf(100)).toBe(60_000);
  });

  it("S streak counts trailing S+ only", () => {
    const runs = [
      entry(1, "A", 1),
      entry(1, "S", 2),
      entry(1, "SS", 3),
      entry(1, "S+", 4),
    ];
    expect(sStreakOf(runs)).toBe(3);
    expect(isSOrAbove("S")).toBe(true);
    expect(isSOrAbove("AAA")).toBe(false);

    const broken = [...runs, entry(1, "AAA", 5)];
    expect(sStreakOf(broken)).toBe(0);
  });

  it("A feeds total", () => {
    const runs = [entry(1000, "S", 1), entry(1000, "SS", 2)];
    const r = computeDanRating(runs, 40);
    // b30=2000, r10=2000, combo=40*50=2000, streak=2*1500=3000
    expect(r.b30).toBe(2000);
    expect(r.r10).toBe(2000);
    expect(r.comboBonus).toBe(2000);
    expect(r.streakBonus).toBe(3000);
    expect(r.total).toBe(9000);
    expect(r.dan).toBe("none");
  });
});

describe("difficultyWeight / compareDan / ornament", () => {
  it("clamps difficulty into 1–7", () => {
    expect(difficultyWeight(0)).toBe(difficultyWeight(1));
    expect(difficultyWeight(99)).toBe(difficultyWeight(7));
    expect(difficultyWeight(3.9)).toBe(difficultyWeight(3));
  });

  it("orders DAN_IDS low → high", () => {
    expect(compareDan("none", "beginner")).toBeLessThan(0);
    expect(compareDan("gokuden", "shinHiden")).toBeGreaterThan(0);
    expect(compareDan("kaiden", "kaiden")).toBe(0);
    expect(DAN_IDS[0]).toBe("none");
    expect(DAN_IDS[DAN_IDS.length - 1]).toBe("gokuden");
  });

  it("ornaments only on shin / gokuden", () => {
    expect(danOrnament("none")).toBe("");
    expect(danOrnament("expert")).toBe("");
    expect(danOrnament("shinKaiden")).toBe(DAN_ORNAMENT.shinKaiden);
    expect(danOrnament("shinHiden")).toBe(DAN_ORNAMENT.shinHiden);
    expect(danOrnament("gokuden")).toBe(DAN_ORNAMENT.gokuden);
  });
});

describe("dan colors", () => {
  it("has flat hex for every known dan", () => {
    for (const id of DAN_IDS) {
      expect(getDanColor(id)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("unknown falls back to none", () => {
    expect(getDanColor("nope")).toBe(getDanColor("none"));
  });

  it("shinHiden css uses gradient; glow is rgba", () => {
    expect(getDanCssColor("shinHiden")).toBe(DAN_SHIN_HIDEN_GRADIENT);
    expect(getDanCssColor("beginner")).toBe(getDanColor("beginner"));
    expect(getDanGlow("nope")).toMatch(/^rgba\(/);
    expect(getDanGlow("expert")).toMatch(/^rgba\(/);
  });

  it("danColorStyle applies gradient clip for shinHiden", () => {
    expect(danColorStyle("shinHiden")).toContain("background-clip:text");
    expect(danColorStyle("shinHiden")).toContain(DAN_SHIN_HIDEN_GRADIENT);
    expect(danColorStyle("kaiden")).toContain("color:");
    expect(danColorStyle("kaiden")).toContain("text-shadow");
  });
});
