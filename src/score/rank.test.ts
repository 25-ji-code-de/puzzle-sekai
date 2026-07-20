/**
 * Pure ScoreRank formula tests — no DOM / PIXI.
 */
import { describe, it, expect } from "vitest";
import {
  computeScoreRank,
  getScoreRankColor,
  getScoreRankCssColor,
  getScoreRankGlow,
  scoreRankColorStyle,
  SCORE_RANKS,
  SCORE_RANK_COLORS,
  SCORE_RANK_SSS_PLUS_GRADIENT,
  type ScoreRank,
} from "./rank";

const endless = (
  score: number,
  multiplier = 1,
  playedSeconds = 90,
): Parameters<typeof computeScoreRank>[0] => ({
  score,
  multiplier,
  mode: "endless",
  playedSeconds,
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
      [300, "C"],
      [700, "B"],
      [1_100, "BB"],
      [1_600, "BBB"],
      [2_300, "A"],
      [3_200, "AA"],
      [4_200, "AAA"],
      [5_500, "S"],
      [7_200, "S+"],
      [9_200, "SS"],
      [11_500, "SS+"],
      [14_500, "SSS"],
      [18_500, "SSS+"],
    ];
    for (const [min, rank] of bounds) {
      expect(computeScoreRank(endless(min))).toBe(rank);
    }
  });

  it("one below threshold stays previous rank", () => {
    expect(computeScoreRank(endless(299))).toBe("D");
    expect(computeScoreRank(endless(699))).toBe("C");
    expect(computeScoreRank(endless(1_099))).toBe("B");
    expect(computeScoreRank(endless(18_499))).toBe("SSS");
  });

  it("SCORE_RANKS covers every letter once", () => {
    expect(SCORE_RANKS).toHaveLength(14);
    expect(new Set(SCORE_RANKS).size).toBe(14);
  });
});

describe("computeScoreRank multiplier strip", () => {
  it("divides score by multiplier", () => {
    // 1925 / 1.75 = 1100 → BB
    expect(computeScoreRank(endless(1925, 1.75))).toBe("BB");
    // same raw score without mult → higher rank (1925 → BBB)
    expect(computeScoreRank(endless(1925, 1))).toBe("BBB");
  });

  it("same mult-stripped performance shares a rank", () => {
    expect(computeScoreRank(endless(5_500, 1))).toBe("S");
    expect(computeScoreRank(endless(16_500, 3))).toBe("S");
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
    // raw 1500 @90s → effective 1500 → BB
    expect(computeScoreRank(ta(1500, 90))).toBe("BB");
    // same raw @60s denser: 1600 * 1.5 = 2400 → A
    expect(computeScoreRank(ta(1600, 60))).toBe("A");
    // same raw @180s thinner: 1500 * 0.5 = 750 → B
    expect(computeScoreRank(ta(1500, 180))).toBe("B");
  });

  it("defaults missing duration to 90", () => {
    expect(
      computeScoreRank({
        score: 1500,
        multiplier: 1,
        mode: "timeAttack",
      }),
    ).toBe("BB");
  });

  it("endless ignores duration field; uses playedSeconds", () => {
    expect(
      computeScoreRank({
        score: 2400,
        multiplier: 1,
        mode: "endless",
        timeAttackDuration: 60,
        playedSeconds: 180,
      }),
    ).toBe("BB"); // 2400 * 90/180 = 1200
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

  it("getScoreRankGlow is rgba derived from flat color", () => {
    const glow = getScoreRankGlow("S");
    expect(glow).toMatch(/^rgba\(\d+, \d+, \d+, 0\.4\)$/);
    // #ffd76a → 255, 215, 106
    expect(glow).toBe("rgba(255, 215, 106, 0.4)");
    expect(getScoreRankGlow("not-a-rank")).toBe("rgba(138, 143, 156, 0.4)"); // D
  });
});
