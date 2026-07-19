/**
 * Dan run-log persistence tests (StoragePort).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  danMessageKey,
  getDanSummary,
  getLastDanRecordResult,
  loadDanState,
  parseDanState,
  recordDanRun,
  resetDanSessionLatch,
  saveDanState,
  summarizeDanState,
} from "./dan-store";
import { DAN_STATE_VERSION, DAN_STORAGE_KEY, emptyDanState } from "./dan";
import {
  localStoragePort,
  setStoragePort,
  type StoragePort,
} from "../settings/storage";

const makeMemoryPort = (): StoragePort & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return {
    map,
    get: (k) => map.get(k) ?? null,
    set: (k, v) => {
      map.set(k, v);
    },
    remove: (k) => {
      map.delete(k);
    },
    keys: () => [...map.keys()],
  };
};

let memory: ReturnType<typeof makeMemoryPort>;

beforeEach(() => {
  memory = makeMemoryPort();
  setStoragePort(memory);
  resetDanSessionLatch();
});

afterEach(() => {
  setStoragePort(localStoragePort);
});

describe("parseDanState", () => {
  it("null / garbage → empty", () => {
    expect(parseDanState(null)).toEqual(emptyDanState());
    expect(parseDanState("{not-json")).toEqual(emptyDanState());
  });

  it("keeps valid runs and recomputes rating from score/mult", () => {
    const raw = JSON.stringify({
      version: 1,
      maxComboPeak: 12,
      runs: [
        {
          id: "r1",
          playedAt: 1000,
          mode: "endless",
          score: 2000,
          maxCombo: 8,
          difficulty: 3,
          entertainment: false,
          multiplier: 2,
          scoreRank: "A",
        },
        {
          // invalid: score 0 dropped
          id: "bad",
          playedAt: 2000,
          score: 0,
          difficulty: 3,
          multiplier: 1,
          scoreRank: "D",
        },
      ],
    });
    const state = parseDanState(raw);
    expect(state.version).toBe(DAN_STATE_VERSION);
    expect(state.runs).toHaveLength(1);
    expect(state.runs[0]!.id).toBe("r1");
    // effective = 2000/2 = 1000; difficulty 3 weight 1.0 → rating 1000
    expect(state.runs[0]!.rating).toBe(1000);
    expect(state.runs[0]!.effectiveScore).toBe(1000);
    expect(state.maxComboPeak).toBe(12);
  });
});

describe("recordDanRun / latch", () => {
  it("records once per session and skips non-positive scores", () => {
    const first = recordDanRun({
      mode: "endless",
      score: 5000,
      maxCombo: 20,
      difficulty: 3,
      entertainment: false,
      multiplier: 1,
      scoreRank: "BBB",
      playedAt: 10_000,
    });
    expect(first.recorded).toBe(true);
    expect(first.after.runCount).toBe(1);
    expect(getLastDanRecordResult()?.recorded).toBe(true);

    const second = recordDanRun({
      mode: "endless",
      score: 9000,
      maxCombo: 30,
      difficulty: 3,
      entertainment: false,
      multiplier: 1,
      scoreRank: "S",
      playedAt: 20_000,
    });
    expect(second.recorded).toBe(false);
    expect(second.after.runCount).toBe(1);

    expect(
      recordDanRun({
        mode: "endless",
        score: 0,
        maxCombo: 0,
        difficulty: 3,
        entertainment: false,
        multiplier: 1,
        scoreRank: "D",
      }).recorded,
    ).toBe(false);
  });

  it("resetDanSessionLatch allows another record", () => {
    recordDanRun({
      mode: "endless",
      score: 1000,
      maxCombo: 5,
      difficulty: 3,
      entertainment: false,
      multiplier: 1,
      scoreRank: "C",
      playedAt: 1,
    });
    resetDanSessionLatch();
    const again = recordDanRun({
      mode: "timeAttack",
      timeAttackDuration: 90,
      score: 2000,
      maxCombo: 10,
      difficulty: 4,
      entertainment: false,
      multiplier: 1,
      scoreRank: "B",
      playedAt: 2,
    });
    expect(again.recorded).toBe(true);
    expect(loadDanState().runs).toHaveLength(2);
    expect(loadDanState().runs[1]!.timeAttackDuration).toBe(90);
  });

  it("save / load round-trips through storage", () => {
    const state = emptyDanState();
    state.runs.push({
      id: "x",
      playedAt: 5,
      mode: "endless",
      score: 1000,
      maxCombo: 3,
      difficulty: 3,
      entertainment: false,
      multiplier: 1,
      scoreRank: "C",
      rating: 1000,
      effectiveScore: 1000,
    });
    state.maxComboPeak = 3;
    saveDanState(state);
    expect(memory.map.has(DAN_STORAGE_KEY)).toBe(true);
    const loaded = loadDanState();
    expect(loaded.runs).toHaveLength(1);
    expect(loaded.runs[0]!.id).toBe("x");
    expect(getDanSummary().runCount).toBe(1);
    expect(summarizeDanState(loaded).maxComboPeak).toBe(3);
  });
});

describe("danMessageKey", () => {
  it("prefixes dan.", () => {
    expect(danMessageKey("beginner")).toBe("dan.beginner");
    expect(danMessageKey("gokuden")).toBe("dan.gokuden");
  });
});

describe("recordDanRun rating inputs", () => {
  it("prefers explicit effectiveScore over score/mult", () => {
    const r = recordDanRun({
      mode: "endless",
      score: 10_000,
      maxCombo: 5,
      difficulty: 3,
      entertainment: false,
      multiplier: 2,
      scoreRank: "A",
      effectiveScore: 500,
      playedAt: 1,
    });
    expect(r.recorded).toBe(true);
    // rating = 500 * weight(3)=1.0
    expect(loadDanState().runs[0]!.rating).toBe(500);
    expect(loadDanState().runs[0]!.effectiveScore).toBe(500);
  });

  it("applies entertainment discount and stores playedSeconds", () => {
    const r = recordDanRun({
      mode: "endless",
      score: 1000,
      maxCombo: 5,
      difficulty: 3,
      entertainment: true,
      multiplier: 1,
      scoreRank: "C",
      effectiveScore: 1000,
      playedSeconds: 120,
      playedAt: 2,
    });
    expect(r.recorded).toBe(true);
    expect(loadDanState().runs[0]!.rating).toBe(900);
    expect(loadDanState().runs[0]!.playedSeconds).toBe(120);
  });

  it("sets promoted when dan rank rises", () => {
    // Seed a mid-tier total, then land a huge run that crosses a threshold.
    for (let i = 0; i < 5; i++) {
      resetDanSessionLatch();
      recordDanRun({
        mode: "endless",
        score: 20_000,
        maxCombo: 10,
        difficulty: 3,
        entertainment: false,
        multiplier: 1,
        scoreRank: "S",
        effectiveScore: 20_000,
        playedAt: i + 1,
      });
    }
    const beforeDan = getDanSummary().dan;
    resetDanSessionLatch();
    const big = recordDanRun({
      mode: "endless",
      score: 5_000_000,
      maxCombo: 50,
      difficulty: 7,
      entertainment: false,
      multiplier: 1,
      scoreRank: "SSS+",
      effectiveScore: 5_000_000,
      playedAt: 100,
    });
    expect(big.recorded).toBe(true);
    if (big.after.dan !== beforeDan) {
      expect(big.promoted).toBe(true);
    }
    expect(big.after.total).toBeGreaterThan(big.before.total);
  });
});
