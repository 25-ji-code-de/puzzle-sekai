/**
 * Stateful score / combo / timer model tests.
 * Settings + high-score + dan-store are mocked so the suite stays pure.
 */
import "../test/dom-shim";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  DEFAULT_SETTINGS,
  type GameMode,
  type GameSettings,
  type GroupName,
  type HighScoreRecord,
} from "../settings/types";
import { DEFAULT_FUN_MODES } from "../fun/modes";
import { emptyRecord } from "../settings/high-score";

type SaveHighScoreFn = typeof import("../settings/high-score").saveHighScore;
type RecordDanRunFn = typeof import("./dan-store").recordDanRun;
type ResetDanSessionLatchFn = typeof import("./dan-store").resetDanSessionLatch;
type RecordDanRunInput = Parameters<RecordDanRunFn>[0];
type RecordDanRunResult = ReturnType<RecordDanRunFn>;

const mockDanSummary: RecordDanRunResult["before"] = {
  b30: 0,
  r10: 0,
  comboBonus: 0,
  streakBonus: 0,
  a: 0,
  total: 0,
  streak: 0,
  dan: "none",
  ornament: "",
  maxComboPeak: 0,
  runCount: 0,
};

const mockSettings: GameSettings = {
  ...DEFAULT_SETTINGS,
  funModes: { ...DEFAULT_FUN_MODES },
  selectedGroups: [...DEFAULT_SETTINGS.selectedGroups] as GroupName[],
  // speed 2 + 5 groups → difficulty 4 → base mult 1.6; item 10% / inverted → ×1
  speedLevel: 2,
  itemDropRate: 10,
  spawnOrientation: "inverted",
};

let mockMode: GameMode = "endless";
let mockHsRecord: HighScoreRecord = emptyRecord();
const saveHighScore = vi.fn<SaveHighScoreFn>(() => false);
const recordDanRun = vi.fn<RecordDanRunFn>(() => ({
  recorded: true,
  before: { ...mockDanSummary },
  after: { ...mockDanSummary, total: 100, runCount: 1 },
  promoted: false,
}));
const resetDanSessionLatch = vi.fn<ResetDanSessionLatchFn>(() => undefined);

vi.mock("../settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../settings")>();
  return {
    ...actual,
    getCurrentSettings: () => mockSettings,
    getCurrentGameMode: () => mockMode,
    loadHighScoreRecord: () => mockHsRecord,
    saveHighScore: (
      mode: GameMode,
      score: number,
      settings?: GameSettings,
    ): boolean => saveHighScore(mode, score, settings),
  };
});

vi.mock("./dan-store", () => ({
  recordDanRun: (input: RecordDanRunInput) => recordDanRun(input),
  resetDanSessionLatch: () => resetDanSessionLatch(),
}));

import {
  DROP_SCORE_FACTOR,
  addDropScore,
  addScore,
  bindScoreHud,
  chainMultiplierOf,
  decrementTime,
  finalizeRunForDan,
  flushHighScoreIfNeeded,
  getCombo,
  getHighScore,
  getPlayedSeconds,
  getScore,
  getScoreSummary,
  getTimeRemaining,
  loadMatchHighScore,
  recordGroupClear,
  resetCombo,
  resetScore,
  seedTimeRemaining,
  setTimeRemaining,
} from "./model";
import { getScoreMultiplier } from "../settings";

beforeEach(() => {
  mockMode = "endless";
  mockHsRecord = emptyRecord();
  saveHighScore.mockReset().mockReturnValue(false);
  recordDanRun.mockClear();
  resetDanSessionLatch.mockClear();
  Object.assign(mockSettings, {
    ...DEFAULT_SETTINGS,
    funModes: { ...DEFAULT_FUN_MODES },
    selectedGroups: [...DEFAULT_SETTINGS.selectedGroups],
    speedLevel: 2,
    itemDropRate: 10,
    spawnOrientation: "inverted",
  });
  bindScoreHud({ onScoreChanged: () => {}, onTimerChanged: () => {} });
  resetScore();
});

afterEach(() => {
  // keep module mocks; only clear spies created in individual tests
});

describe("addScore / combo", () => {
  it("increments combo and maxCombo; score uses chain × settings mult", () => {
    const mult = getScoreMultiplier(mockSettings);
    // first clear: combo 1 → chain 1; 5 pieces → 50 * 1 * mult
    addScore(5);
    expect(getCombo()).toBe(1);
    expect(getScore()).toBe(Math.round(50 * 1 * mult));

    // second clear: combo 2 → chain 1.2; + 3*10 * 1.2 * mult
    addScore(3);
    expect(getCombo()).toBe(2);
    const expected =
      Math.round(50 * 1 * mult) + Math.round(30 * chainMultiplierOf(2) * mult);
    expect(getScore()).toBe(expected);

    const summary = getScoreSummary();
    expect(summary.maxCombo).toBe(2);
  });

  it("resetCombo zeros combo but keeps score / maxCombo", () => {
    addScore(2);
    addScore(2);
    const score = getScore();
    resetCombo();
    expect(getCombo()).toBe(0);
    expect(getScore()).toBe(score);
    expect(getScoreSummary().maxCombo).toBe(2);
  });

  it("raises in-memory high score without persisting", () => {
    mockHsRecord = {
      score: 10,
      difficultyLevel: 2,
      entertainment: false,
      updatedAt: 1,
    };
    loadMatchHighScore();
    expect(getHighScore()).toBe(10);
    addScore(10); // plenty of points
    expect(getScore()).toBeGreaterThan(10);
    expect(getHighScore()).toBe(getScore());
    expect(saveHighScore).not.toHaveBeenCalled();
  });
});

describe("addDropScore", () => {
  it("applies DROP_SCORE_FACTOR × settings mult", () => {
    const mult = getScoreMultiplier(mockSettings);
    addDropScore(100);
    expect(getScore()).toBe(Math.round(100 * mult * DROP_SCORE_FACTOR));
  });

  it("does not advance combo", () => {
    addDropScore(40);
    expect(getCombo()).toBe(0);
  });
});

describe("resetScore", () => {
  it("zeros score/combo/groups and latches dan session", () => {
    addScore(4);
    recordGroupClear("Leo/need");
    setTimeRemaining(30);
    resetScore();
    expect(getScore()).toBe(0);
    expect(getCombo()).toBe(0);
    expect(getTimeRemaining()).toBe(0);
    expect(getScoreSummary().maxCombo).toBe(0);
    expect(getScoreSummary().groupClears).toEqual({});
    expect(getScoreSummary().isNewRecord).toBe(false);
    expect(resetDanSessionLatch).toHaveBeenCalled();
  });

  it("starts the match clock", () => {
    const spy = vi.spyOn(performance, "now").mockReturnValue(5_000);
    resetScore();
    spy.mockReturnValue(8_000);
    expect(getPlayedSeconds()).toBeCloseTo(3);
  });
});

describe("timer", () => {
  it("setTimeRemaining clamps negative to 0 and notifies HUD", () => {
    const onTimer = vi.fn();
    bindScoreHud({ onScoreChanged: () => {}, onTimerChanged: onTimer });
    setTimeRemaining(12);
    expect(getTimeRemaining()).toBe(12);
    expect(onTimer).toHaveBeenCalled();
    setTimeRemaining(-5);
    expect(getTimeRemaining()).toBe(0);
  });

  it("seedTimeRemaining does not notify HUD", () => {
    const onTimer = vi.fn();
    bindScoreHud({ onScoreChanged: () => {}, onTimerChanged: onTimer });
    seedTimeRemaining(45);
    expect(getTimeRemaining()).toBe(45);
    expect(onTimer).not.toHaveBeenCalled();
  });

  it("decrementTime returns true when remaining hits ≤0", () => {
    setTimeRemaining(2);
    expect(decrementTime()).toBe(false);
    expect(getTimeRemaining()).toBe(1);
    expect(decrementTime()).toBe(true);
    expect(getTimeRemaining()).toBe(0);
  });
});

describe("recordGroupClear / getScoreSummary", () => {
  it("counts group clears and exposes them as a clone", () => {
    recordGroupClear("Leo/need");
    recordGroupClear("Leo/need");
    recordGroupClear("Vivid BAD SQUAD");
    const summary = getScoreSummary();
    expect(summary.groupClears).toEqual({
      "Leo/need": 2,
      "Vivid BAD SQUAD": 1,
    });
    summary.groupClears["Leo/need"] = 99;
    expect(getScoreSummary().groupClears["Leo/need"]).toBe(2);
  });

  it("effectiveScore and scoreRank are consistent with mult strip", () => {
    // Force mult via known defaults; score via addScore once with combo 1
    const mult = getScoreMultiplier(mockSettings);
    addScore(10); // 100 * 1 * mult
    const summary = getScoreSummary();
    expect(summary.score).toBe(Math.round(100 * mult));
    expect(summary.multiplier).toBeCloseTo(mult);
    // with playedSeconds ≈ 0 → density uses baseline 90 (missing/0 → 90)
    expect(summary.effectiveScore).toBeCloseTo(summary.score / mult, 0);
    expect(summary.scoreRank).toBeTruthy();
    expect(summary.mode).toBe("endless");
    expect(summary.difficulty).toBe(4);
  });
});

describe("flushHighScoreIfNeeded", () => {
  it("skips non-positive scores", () => {
    expect(flushHighScoreIfNeeded()).toBe(false);
    expect(saveHighScore).not.toHaveBeenCalled();
    expect(getScoreSummary().isNewRecord).toBe(false);
  });

  it("persists when saveHighScore reports a new record", () => {
    saveHighScore.mockReturnValue(true);
    addScore(5);
    const score = getScore();
    expect(flushHighScoreIfNeeded()).toBe(true);
    expect(saveHighScore).toHaveBeenCalledWith("endless", score, mockSettings);
    expect(getHighScore()).toBe(score);
    expect(getScoreSummary().isNewRecord).toBe(true);
  });

  it("does not raise high score when not a new record", () => {
    mockHsRecord = {
      score: 999_999,
      difficultyLevel: 4,
      entertainment: false,
      updatedAt: 1,
    };
    loadMatchHighScore();
    saveHighScore.mockReturnValue(false);
    addScore(1);
    expect(flushHighScoreIfNeeded()).toBe(false);
    expect(getHighScore()).toBe(999_999);
    expect(getScoreSummary().isNewRecord).toBe(false);
  });
});

describe("finalizeRunForDan", () => {
  it("forwards summary fields to recordDanRun", () => {
    addScore(8);
    recordGroupClear("MORE MORE JUMP!");
    const result = finalizeRunForDan();
    expect(recordDanRun).toHaveBeenCalledTimes(1);
    const arg: RecordDanRunInput = recordDanRun.mock.calls[0]![0];
    expect(arg.score).toBe(getScore());
    expect(arg.maxCombo).toBe(1);
    expect(arg.mode).toBe("endless");
    expect(arg.multiplier).toBeCloseTo(getScoreMultiplier(mockSettings));
    expect(arg.effectiveScore).toBeGreaterThan(0);
    expect(result.recorded).toBe(true);
  });
});
