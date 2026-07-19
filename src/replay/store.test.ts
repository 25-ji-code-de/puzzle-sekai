import "../test/dom-shim";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_FUN_MODES } from "../fun/modes";
import { DEFAULT_SETTINGS, type GroupName } from "../settings/types";
import {
  localStoragePort,
  setStoragePort,
  type StoragePort,
} from "../settings/storage";
import {
  REPLAY_LIMIT,
  REPLAY_STORAGE_KEY,
  appendReplayEntry,
  clearReplayEntries,
  listReplaySummaries,
  loadReplayEntries,
  loadReplayEntry,
  type ReplayEntry,
} from "./index";

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

const makeReplay = (n: number): ReplayEntry => ({
  v: 1,
  id: `r-${n}`,
  savedAt: 1_000 + n,
  seed: n,
  mode: n % 2 === 0 ? "daily" : "endless",
  dailyDateKey: n % 2 === 0 ? "2026-07-19" : undefined,
  settings: {
    speedLevel: 2,
    timeAttackDuration: 90,
    selectedGroups: [...DEFAULT_SETTINGS.selectedGroups] as GroupName[],
    funModes: { ...DEFAULT_FUN_MODES },
    itemDropRate: 10,
    spawnOrientation: "inverted",
  },
  score: 100 * n,
  maxCombo: n,
  difficulty: 4,
  entertainment: false,
  multiplier: 1.6,
  scoreRank: "A",
  playedSeconds: 30 + n,
  durationMs: 30_000 + n,
  inputs: [{ t: 10, a: "L" }],
});

let memory: ReturnType<typeof makeMemoryPort>;

beforeEach(() => {
  memory = makeMemoryPort();
  setStoragePort(memory);
});

afterEach(() => {
  setStoragePort(localStoragePort);
});

describe("replay store", () => {
  it("starts empty and tolerates bad JSON", () => {
    expect(loadReplayEntries()).toEqual([]);
    memory.set(REPLAY_STORAGE_KEY, "not-json");
    expect(loadReplayEntries()).toEqual([]);
  });

  it("appends newest first and caps at REPLAY_LIMIT", () => {
    for (let i = 1; i <= REPLAY_LIMIT + 3; i++) {
      appendReplayEntry(makeReplay(i));
    }
    const all = loadReplayEntries();
    expect(all).toHaveLength(REPLAY_LIMIT);
    expect(all[0]!.id).toBe(`r-${REPLAY_LIMIT + 3}`);
    expect(all.at(-1)!.id).toBe("r-4");
  });

  it("replaces duplicate id instead of duplicating", () => {
    appendReplayEntry(makeReplay(1));
    appendReplayEntry({ ...makeReplay(1), score: 999, savedAt: 9_999 });
    const all = loadReplayEntries();
    expect(all).toHaveLength(1);
    expect(all[0]!.score).toBe(999);
  });

  it("loads one replay by id and lists summaries", () => {
    appendReplayEntry(makeReplay(2));
    expect(loadReplayEntry("r-2")?.dailyDateKey).toBe("2026-07-19");
    const summary = listReplaySummaries()[0]!;
    expect(summary.id).toBe("r-2");
    expect(summary.score).toBe(200);
    expect(summary.mode).toBe("daily");
  });

  it("clears stored replays", () => {
    appendReplayEntry(makeReplay(1));
    clearReplayEntries();
    expect(loadReplayEntries()).toEqual([]);
    expect(memory.get(REPLAY_STORAGE_KEY)).toBeNull();
  });
});
