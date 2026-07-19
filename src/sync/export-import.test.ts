/**
 * Local pico export / import round-trip (StoragePort only).
 */
import "../test/dom-shim";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { exportLocalPicoData } from "./export-local";
import { importLocalPicoData } from "./import-local";
import { DAN_STORAGE_KEY, emptyDanState, type DanRunEntry } from "../score/dan";
import { loadDanState, saveDanState } from "../score/dan-store";
import {
  localStoragePort,
  setStoragePort,
  type StoragePort,
} from "../settings/storage";
import type { HighScoreRecord } from "../settings";
import type { PicoSyncData } from "./types";

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

const run = (id: string, playedAt: number): DanRunEntry => ({
  id,
  playedAt,
  mode: "endless",
  score: 1200,
  maxCombo: 8,
  difficulty: 3,
  entertainment: false,
  multiplier: 1,
  scoreRank: "A",
  rating: 1200,
  effectiveScore: 1200,
});

const hs = (score: number): HighScoreRecord => ({
  score,
  difficultyLevel: 4,
  entertainment: false,
  updatedAt: 100,
});

let memory: ReturnType<typeof makeMemoryPort>;

beforeEach(() => {
  memory = makeMemoryPort();
  setStoragePort(memory);
});

afterEach(() => {
  setStoragePort(localStoragePort);
});

describe("exportLocalPicoData", () => {
  it("empty storage → schema 1 with empty runs / highScores", () => {
    const data = exportLocalPicoData();
    expect(data.schema).toBe(1);
    expect(data.dan.runs).toEqual([]);
    expect(data.dan.maxComboPeak).toBe(0);
    expect(data.highScores).toEqual({});
  });

  it("loads dan and only positive-score hs buckets", () => {
    const state = emptyDanState();
    state.runs.push(run("a", 1));
    state.maxComboPeak = 8;
    saveDanState(state);
    memory.set("hs:endless:4:std", JSON.stringify(hs(500)));
    memory.set("hs:timeAttack:90:3:ent", JSON.stringify(hs(0)));
    memory.set("hs:endless:2:std", JSON.stringify(hs(0)));
    memory.set("puzzleSekaiAuth", "nope");
    memory.set("unrelated", "x");

    const data = exportLocalPicoData();
    expect(data.dan.runs).toHaveLength(1);
    expect(data.dan.runs[0]!.id).toBe("a");
    expect(data.dan.maxComboPeak).toBe(8);
    expect(Object.keys(data.highScores).sort()).toEqual(["hs:endless:4:std"]);
    expect(data.highScores["hs:endless:4:std"]!.score).toBe(500);
  });

  it("clones runs so mutating export does not touch store", () => {
    const state = emptyDanState();
    state.runs.push(run("x", 5));
    saveDanState(state);
    const data = exportLocalPicoData();
    data.dan.runs.push(run("mutated", 9));
    expect(loadDanState().runs).toHaveLength(1);
  });
});

describe("importLocalPicoData", () => {
  it("writes dan state and each hs record", () => {
    const payload: PicoSyncData = {
      schema: 1,
      dan: {
        version: 1,
        runs: [run("cloud", 10)],
        maxComboPeak: 12,
      },
      highScores: {
        "hs:endless:5:std": hs(900),
        "hs:timeAttack:60:2:std": hs(400),
      },
    };
    importLocalPicoData(payload);
    const dan = loadDanState();
    expect(dan.runs.map((r) => r.id)).toEqual(["cloud"]);
    expect(dan.maxComboPeak).toBe(12);
    expect(JSON.parse(memory.get("hs:endless:5:std")!).score).toBe(900);
    expect(JSON.parse(memory.get("hs:timeAttack:60:2:std")!).score).toBe(400);
  });

  it("removes local hs keys absent from merged payload", () => {
    memory.set("hs:endless:1:std", JSON.stringify(hs(10)));
    memory.set("hs:endless:2:std", JSON.stringify(hs(20)));
    memory.set("puzzleSekaiAuth", "keep");
    importLocalPicoData({
      schema: 1,
      dan: emptyDanState(),
      highScores: {
        "hs:endless:2:std": hs(20),
      },
    });
    expect(memory.get("hs:endless:1:std")).toBeNull();
    expect(memory.get("hs:endless:2:std")).not.toBeNull();
    expect(memory.get("puzzleSekaiAuth")).toBe("keep");
  });

  it("skips non-hs keys and non-positive scores in payload", () => {
    importLocalPicoData({
      schema: 1,
      dan: emptyDanState(),
      highScores: {
        "nope:key": hs(50),
        "hs:endless:3:std": hs(0),
        "hs:endless:4:std": hs(70),
      },
    });
    expect(memory.get("nope:key")).toBeNull();
    expect(memory.get("hs:endless:3:std")).toBeNull();
    expect(JSON.parse(memory.get("hs:endless:4:std")!).score).toBe(70);
  });
});

describe("export ↔ import round-trip", () => {
  it("preserves dan + high scores", () => {
    const state = emptyDanState();
    state.runs.push(run("r1", 1), run("r2", 2));
    state.maxComboPeak = 15;
    saveDanState(state);
    memory.set("hs:endless:4:std", JSON.stringify(hs(333)));
    memory.set("hs:timeAttack:180:7:ent", JSON.stringify(hs(777)));

    const exported = exportLocalPicoData();
    // wipe then re-import
    memory.map.clear();
    importLocalPicoData(exported);
    const again = exportLocalPicoData();
    expect(again.dan.runs.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(again.dan.maxComboPeak).toBe(15);
    expect(again.highScores["hs:endless:4:std"]!.score).toBe(333);
    expect(again.highScores["hs:timeAttack:180:7:ent"]!.score).toBe(777);
    expect(memory.map.has(DAN_STORAGE_KEY)).toBe(true);
  });
});
