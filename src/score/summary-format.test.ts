/**
 * Score summary presentation helper tests (pure).
 */
import { describe, it, expect } from "vitest";
import {
  padDigits,
  splitPaddedNumber,
  groupsForSummary,
  formatMultiplier,
  SCORE_PAD,
  COMBO_PAD,
  GROUP_CLEAR_PAD,
} from "./summary-format";
import type { ScoreSummary } from "./model";
import { GAME_GROUPS } from "../settings/types";

describe("padDigits / splitPaddedNumber", () => {
  it("pads non-negative floors", () => {
    expect(padDigits(42, 4)).toBe("0042");
    expect(padDigits(-3, 3)).toBe("000");
    expect(padDigits(3.9, 2)).toBe("03");
  });

  it("splits leading zeros from significant digits", () => {
    expect(splitPaddedNumber(42, 6)).toEqual({ pad: "0000", solid: "42" });
    expect(splitPaddedNumber(0, 4)).toEqual({ pad: "000", solid: "0" });
    expect(splitPaddedNumber(1000, 4)).toEqual({ pad: "", solid: "1000" });
  });

  it("exports pad widths", () => {
    expect(SCORE_PAD).toBe(8);
    expect(COMBO_PAD).toBe(4);
    expect(GROUP_CLEAR_PAD).toBe(4);
  });
});

describe("formatMultiplier", () => {
  it("formats × with 2 decimals", () => {
    expect(formatMultiplier(1)).toBe("×1.00");
    expect(formatMultiplier(1.25)).toBe("×1.25");
  });
});

describe("groupsForSummary", () => {
  const base = (partial: Partial<ScoreSummary>): ScoreSummary =>
    ({
      score: 0,
      maxCombo: 0,
      timeRemaining: 0,
      mode: "endless",
      difficulty: 2,
      difficultyLabel: "2",
      entertainment: false,
      multiplier: 1,
      highScore: 0,
      highScoreDifficulty: 0,
      highScoreEntertainment: false,
      highScoreLabel: "",
      isNewRecord: false,
      groupClears: {},
      selectedGroups: [],
      playedSeconds: 0,
      effectiveScore: 0,
      scoreRank: "D",
      ...partial,
    }) as ScoreSummary;

  it("keeps official unit order for selected groups", () => {
    const summary = base({
      selectedGroups: [
        "25時、ナイトコードで。",
        "Leo/need",
        "Vivid BAD SQUAD",
      ],
    });
    expect(groupsForSummary(summary)).toEqual([
      "Leo/need",
      "Vivid BAD SQUAD",
      "25時、ナイトコードで。",
    ]);
  });

  it("includes groups with clear counts even if not selected", () => {
    const summary = base({
      selectedGroups: ["Leo/need", "MORE MORE JUMP!", "Vivid BAD SQUAD"],
      groupClears: { "Wonderlands×Showtime": 2 },
    });
    expect(groupsForSummary(summary)).toEqual([
      "Leo/need",
      "MORE MORE JUMP!",
      "Vivid BAD SQUAD",
      "Wonderlands×Showtime",
    ]);
  });

  it("ignores zero-clear entries that were not selected", () => {
    const summary = base({
      selectedGroups: GAME_GROUPS.slice(0, 3) as ScoreSummary["selectedGroups"],
      groupClears: { "25時、ナイトコードで。": 0 },
    });
    expect(groupsForSummary(summary)).not.toContain("25時、ナイトコードで。");
  });
});
