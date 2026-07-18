/**
 * Pure dan rating tests — no DOM / PIXI.
 */
import { describe, it, expect } from "vitest";
import {
  comboBonusOf,
  computeDanRating,
  danFromTotal,
  isSOrAbove,
  runRating,
  sStreakOf,
  streakBonusOf,
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
  it("applies difficulty weight", () => {
    expect(runRating(1000, 3)).toBe(1000);
    expect(runRating(1000, 4)).toBe(1050);
    expect(runRating(1000, 7)).toBe(1300);
    expect(runRating(1000, 1)).toBe(900);
  });

  it("rejects non-positive scores", () => {
    expect(runRating(0, 4)).toBe(0);
    expect(runRating(-10, 4)).toBe(0);
  });
});

describe("danFromTotal thresholds", () => {
  it("maps boundaries", () => {
    expect(danFromTotal(0)).toBe("none");
    expect(danFromTotal(79_999)).toBe("none");
    expect(danFromTotal(80_000)).toBe("beginner");
    expect(danFromTotal(200_000)).toBe("intermediate");
    expect(danFromTotal(450_000)).toBe("advanced");
    expect(danFromTotal(850_000)).toBe("expert");
    expect(danFromTotal(1_400_000)).toBe("kaiden");
    expect(danFromTotal(2_200_000)).toBe("hiden");
    expect(danFromTotal(3_400_000)).toBe("shinKaiden");
    expect(danFromTotal(5_200_000)).toBe("shinHiden");
    expect(danFromTotal(8_000_000)).toBe("gokuden");
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

  it("combo and streak bonuses cap", () => {
    expect(comboBonusOf(50)).toBe(1250);
    expect(comboBonusOf(320)).toBe(8000);
    expect(comboBonusOf(9999)).toBe(8000);
    expect(streakBonusOf(5)).toBe(2000);
    expect(streakBonusOf(30)).toBe(12000);
    expect(streakBonusOf(100)).toBe(12000);
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
    // b30=2000, r10=2000, combo=1000, streak=2*400=800
    expect(r.b30).toBe(2000);
    expect(r.r10).toBe(2000);
    expect(r.comboBonus).toBe(1000);
    expect(r.streakBonus).toBe(800);
    expect(r.total).toBe(5800);
    expect(r.dan).toBe("none");
  });
});
