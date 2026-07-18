/**
 * Pure ScoreRank formula tests — no DOM / PIXI.
 */
import { describe, it, expect } from "vitest";
import {
  computeScoreRank,
  getScoreRankColor,
  getScoreRankCssColor,
  scoreRankColorStyle,
  SCORE_RANKS,
  SCORE_RANK_COLORS,
  SCORE_RANK_SSS_PLUS_GRADIENT,
  type ScoreRank,
} from "./rank";

const endless = (
  score: number,
  multiplier = 1,
): Parameters<typeof computeScoreRank>[0] => ({
  score,
  multiplier,
  mode: "endless",
});

const ta = (
  score: number,
  duration: number,
  multiplier = 1,
): Parameters<typeof computeScoreRank>[0] => ({
  score,
  multiplier,
  mode: "timeAttack",
  timeAttackDuration: duration,
});

describe("computeScoreRank thresholds", () => {
  it("score 0 → D", () => {
    expect(computeScoreRank(endless(0))).toBe("D");
  });

  it("maps exact lower bounds", () => {
    const bounds: [number, ScoreRank][] = [
      [0, "D"],
      [400, "C"],
      [900, "B"],
      [1_600, "BB"],
      [2_600, "BBB"],
      [4_000, "A"],
      [5_800, "AA"],
      [8_000, "AAA"],
      [11_000, "S"],
      [15_000, "S+"],
      [20_000, "SS"],
      [27_000, "SS+"],
      [36_000, "SSS"],
      [48_000, "SSS+"],
    ];
    for (const [min, rank] of bounds) {
      expect(computeScoreRank(endless(min))).toBe(rank);
    }
  });

  it("one below threshold stays previous rank", () => {
    expect(computeScoreRank(endless(399))).toBe("D");
    expect(computeScoreRank(endless(899))).toBe("C");
    expect(computeScoreRank(endless(1_599))).toBe("B");
    expect(computeScoreRank(endless(47_999))).toBe("SSS");
  });

  it("SCORE_RANKS covers every letter once", () => {
    expect(SCORE_RANKS).toHaveLength(14);
    expect(new Set(SCORE_RANKS).size).toBe(14);
  });
});

describe("computeScoreRank multiplier strip", () => {
  it("divides score by multiplier", () => {
    // 3500 / 1.75 = 2000 → BB
    expect(computeScoreRank(endless(3500, 1.75))).toBe("BB");
    // same raw score without mult → higher rank (3500 → BBB)
    expect(computeScoreRank(endless(3500, 1))).toBe("BBB");
  });

  it("guards non-positive multiplier", () => {
    expect(computeScoreRank(endless(1000, 0))).toBe("SSS+");
    expect(computeScoreRank(endless(1000, -1))).toBe("SSS+");
  });

  it("guards non-finite score", () => {
    expect(computeScoreRank(endless(Number.NaN))).toBe("D");
    expect(computeScoreRank(endless(-50))).toBe("D");
  });
});

describe("computeScoreRank time attack duration", () => {
  it("normalizes to 90s baseline", () => {
    // raw 3000 @90s → effective 3000 → BBB
    expect(computeScoreRank(ta(3000, 90))).toBe("BBB");
    // same raw @60s → effective 3000 * 1.5 = 4500 → A
    expect(computeScoreRank(ta(3000, 60))).toBe("A");
    // same raw @180s → effective 3000 * 0.5 = 1500 → B
    expect(computeScoreRank(ta(3000, 180))).toBe("B");
  });

  it("defaults missing duration to 90", () => {
    expect(
      computeScoreRank({
        score: 3000,
        multiplier: 1,
        mode: "timeAttack",
      }),
    ).toBe("BBB");
  });

  it("endless ignores duration field", () => {
    expect(
      computeScoreRank({
        score: 3000,
        multiplier: 1,
        mode: "endless",
        timeAttackDuration: 60,
      }),
    ).toBe("BBB");
  });
});

describe("rank colors", () => {
  it("has a flat color for every rank", () => {
    for (const r of SCORE_RANKS) {
      expect(SCORE_RANK_COLORS[r]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("S keeps the classic gold", () => {
    expect(getScoreRankColor("S")).toBe("#ffd76a");
  });

  it("SSS+ css color is gradient; flat fallback is start pink", () => {
    expect(getScoreRankCssColor("SSS+")).toBe(SCORE_RANK_SSS_PLUS_GRADIENT);
    expect(getScoreRankColor("SSS+")).toBe("#ff88cc");
  });

  it("unknown rank falls back to D", () => {
    expect(getScoreRankColor("Z")).toBe(SCORE_RANK_COLORS.D);
  });

  it("scoreRankColorStyle applies color or gradient clip", () => {
    expect(scoreRankColorStyle("S")).toContain("color:#ffd76a");
    expect(scoreRankColorStyle("S")).toContain("text-shadow");
    expect(scoreRankColorStyle("SSS+")).toContain("background-clip:text");
    expect(scoreRankColorStyle("SSS+")).toContain(SCORE_RANK_SSS_PLUS_GRADIENT);
  });
});
