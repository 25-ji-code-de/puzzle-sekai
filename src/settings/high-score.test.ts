/**
 * High-score key / parse / bucket persistence tests.
 */
import "../test/dom-shim";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  emptyRecord,
  getHighScoreKey,
  listHighScoreRecords,
  loadBestHighScoreRecord,
  loadHighScore,
  loadHighScoreRecord,
  parseRecord,
  saveHighScore,
} from "./high-score";
import {
  DEFAULT_SETTINGS,
  type GameSettings,
  type GroupName,
} from "./types";
import { DEFAULT_FUN_MODES } from "../fun/modes";
import { localStoragePort, setStoragePort, type StoragePort } from "./storage";

/** In-memory StoragePort for isolation. */
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

const settings = (partial: Partial<GameSettings> = {}): GameSettings => ({
  ...DEFAULT_SETTINGS,
  funModes: { ...DEFAULT_FUN_MODES },
  selectedGroups: [...DEFAULT_SETTINGS.selectedGroups] as GroupName[],
  ...partial,
});

let memory: ReturnType<typeof makeMemoryPort>;

beforeEach(() => {
  memory = makeMemoryPort();
  setStoragePort(memory);
});

afterEach(() => {
  // Restore real localStorage port so other suites are unaffected.
  setStoragePort(localStoragePort);
});

describe("getHighScoreKey", () => {
  it("endless key includes difficulty and std/ent", () => {
    expect(getHighScoreKey("endless", 4, false)).toBe("hs:endless:4:std");
    expect(getHighScoreKey("endless", 4, true)).toBe("hs:endless:4:ent");
  });

  it("timeAttack key includes duration", () => {
    expect(
      getHighScoreKey("timeAttack", 3, false, settings({ timeAttackDuration: 60 })),
    ).toBe("hs:timeAttack:60:3:std");
  });

  it("clamps difficulty into 1–7", () => {
    expect(getHighScoreKey("endless", 0, false)).toBe("hs:endless:1:std");
    expect(getHighScoreKey("endless", 99, true)).toBe("hs:endless:7:ent");
  });
});

describe("parseRecord / emptyRecord", () => {
  it("empty / null → zero record", () => {
    expect(emptyRecord()).toEqual({
      score: 0,
      difficultyLevel: 0,
      entertainment: false,
      updatedAt: 0,
    });
    expect(parseRecord(null)).toEqual(emptyRecord());
  });

  it("parses JSON records", () => {
    const raw = JSON.stringify({
      score: 1200,
      difficultyLevel: 5,
      entertainment: true,
      updatedAt: 42,
    });
    expect(parseRecord(raw)).toEqual({
      score: 1200,
      difficultyLevel: 5,
      entertainment: true,
      updatedAt: 42,
    });
  });

  it("plain number string is legacy score-only", () => {
    expect(parseRecord("999")).toMatchObject({ score: 999, difficultyLevel: 0 });
  });

  it("garbage JSON → empty", () => {
    expect(parseRecord("{not-json")).toEqual(emptyRecord());
  });
});

describe("save / load buckets", () => {
  const s = () =>
    settings({
      speedLevel: 2,
      selectedGroups: DEFAULT_SETTINGS.selectedGroups.slice(0, 3) as GroupName[],
    }); // difficulty = 2

  it("save only when score beats current bucket", () => {
    expect(saveHighScore("endless", 100, s())).toBe(true);
    expect(saveHighScore("endless", 50, s())).toBe(false);
    expect(saveHighScore("endless", 200, s())).toBe(true);
    expect(loadHighScore("endless", s())).toBe(200);
  });

  it("loadHighScoreRecord matches current settings bucket", () => {
    saveHighScore("endless", 500, s());
    const rec = loadHighScoreRecord("endless", s());
    expect(rec.score).toBe(500);
    expect(rec.difficultyLevel).toBe(2);
    expect(rec.entertainment).toBe(false);
  });

  it("list and best span all difficulty / ent buckets", () => {
    // Write into difficulty 2 std
    saveHighScore("endless", 100, s());
    // Write higher into difficulty 4 std (speed 2 + 5 groups)
    const hard = settings({
      speedLevel: 2,
      selectedGroups: [...DEFAULT_SETTINGS.selectedGroups],
    });
    saveHighScore("endless", 300, hard);
    // Entertainment bucket lower score
    const ent = settings({
      speedLevel: 2,
      selectedGroups: DEFAULT_SETTINGS.selectedGroups.slice(0, 3) as GroupName[],
      funModes: { ...DEFAULT_FUN_MODES, mikudayo: true },
    });
    saveHighScore("endless", 150, ent);

    const listed = listHighScoreRecords("endless", s());
    expect(listed.map((r) => r.score).sort((a, b) => a - b)).toEqual([100, 150, 300]);
    expect(loadBestHighScoreRecord("endless", s()).score).toBe(300);
  });

  it("migrates legacy flat keys into JSON bucket", () => {
    memory.set("highScore_endless", "777");
    memory.set("highScore_endless_difficulty", "3");
    memory.set("highScore_endless_entertainment", "0");
    const rec = loadHighScoreRecord(
      "endless",
      settings({
        speedLevel: 3,
        selectedGroups: DEFAULT_SETTINGS.selectedGroups.slice(0, 3) as GroupName[],
      }),
    );
    // difficulty 3 + 0 groups-extra = 3 matches legacy bucket
    expect(rec.score).toBe(777);
    expect(memory.get("highScore_endless")).toBeNull();
  });
});
