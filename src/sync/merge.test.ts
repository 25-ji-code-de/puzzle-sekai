/**
 * Merge unit tests for pico sync.
 */
import { describe, it, expect } from "vitest";
import {
  isBetterHighScore,
  mergeDanStates,
  mergeHighScores,
  mergePicoData,
  parsePicoSyncData,
} from "./merge";
import type { DanRunEntry, DanState } from "../score/dan";
import type { HighScoreRecord } from "../settings";

const run = (
  id: string,
  playedAt: number,
  rating = 100,
  maxCombo = 5,
): DanRunEntry => ({
  id,
  playedAt,
  mode: "endless",
  score: rating,
  maxCombo,
  difficulty: 3,
  entertainment: false,
  multiplier: 1,
  scoreRank: "A",
  rating,
});

const hs = (
  score: number,
  updatedAt: number,
  entertainment = false,
): HighScoreRecord => ({
  score,
  difficultyLevel: 4,
  entertainment,
  updatedAt,
});

describe("mergeHighScores", () => {
  it("takes higher score", () => {
    const out = mergeHighScores(
      { "hs:endless:4:std": hs(100, 1) },
      { "hs:endless:4:std": hs(200, 2) },
    );
    expect(out["hs:endless:4:std"]!.score).toBe(200);
  });

  it("unions different keys", () => {
    const out = mergeHighScores(
      { "hs:endless:1:std": hs(10, 1) },
      { "hs:endless:2:std": hs(20, 1) },
    );
    expect(Object.keys(out).sort()).toEqual([
      "hs:endless:1:std",
      "hs:endless:2:std",
    ]);
  });

  it("isBetter prefers std on equal score", () => {
    expect(isBetterHighScore(hs(100, 1, false), hs(100, 1, true))).toBe(true);
  });
});

describe("mergeDanStates", () => {
  it("unions by id and caps length", () => {
    const local: DanState = {
      version: 1,
      runs: [run("a", 1), run("b", 3)],
      maxComboPeak: 10,
    };
    const cloud: DanState = {
      version: 1,
      runs: [run("b", 2, 50, 20), run("c", 4)],
      maxComboPeak: 15,
    };
    const m = mergeDanStates(local, cloud);
    expect(m.runs.map((r) => r.id)).toEqual(["a", "b", "c"]);
    // local b has later playedAt → keep local b
    expect(m.runs.find((r) => r.id === "b")!.playedAt).toBe(3);
    expect(m.maxComboPeak).toBe(15);
  });
});

describe("mergePicoData / parse", () => {
  it("merges null cloud as local copy", () => {
    const local = mergePicoData(
      {
        schema: 1,
        dan: { version: 1, runs: [run("x", 1)], maxComboPeak: 3 },
        highScores: { "hs:endless:3:std": hs(9, 1) },
      },
      null,
    );
    expect(local.dan.runs).toHaveLength(1);
    expect(local.highScores["hs:endless:3:std"]!.score).toBe(9);
  });

  it("parsePicoSyncData filters junk", () => {
    const p = parsePicoSyncData({
      schema: 1,
      dan: {
        version: 1,
        runs: [{ id: "z", playedAt: 1, score: 10, rating: 10, scoreRank: "S" }],
        maxComboPeak: 1,
      },
      highScores: {
        "hs:endless:1:std": { score: 5, difficultyLevel: 1 },
        "nope": { score: 1 },
      },
    });
    expect(p).not.toBeNull();
    expect(p!.dan.runs[0]!.id).toBe("z");
    expect(p!.highScores["hs:endless:1:std"]!.score).toBe(5);
    expect(p!.highScores["nope"]).toBeUndefined();
  });
});
