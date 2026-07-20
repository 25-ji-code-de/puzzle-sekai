/**
 * Pure replay parse / input validation tests.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_FUN_MODES } from "../fun/modes";
import { DEFAULT_SETTINGS, type GroupName } from "../settings/types";
import {
  isReplayInput,
  parseReplayEntry,
  sortReplaysNewestFirst,
} from "./parse";

const validSettings = {
  speedLevel: 2 as const,
  timeAttackDuration: 90 as const,
  selectedGroups: [...DEFAULT_SETTINGS.selectedGroups] as GroupName[],
  funModes: { ...DEFAULT_FUN_MODES },
  itemDropRate: 10 as const,
  spawnOrientation: "inverted" as const,
};

const validRaw = {
  v: 1,
  id: "r1",
  savedAt: 1000,
  seed: 42,
  mode: "endless",
  settings: validSettings,
  score: 100,
  maxCombo: 3,
  difficulty: 4,
  entertainment: false,
  multiplier: 1.6,
  scoreRank: "A",
  playedSeconds: 30,
  durationMs: 30000,
  inputs: [{ t: 10, a: "L" }],
};

describe("isReplayInput", () => {
  it("accepts known actions with non-negative t", () => {
    expect(isReplayInput({ t: 0, a: "L" })).toBe(true);
    expect(isReplayInput({ t: 1.5, a: "HD" })).toBe(true);
    expect(isReplayInput({ t: 0, a: "LF" })).toBe(true);
  });
  it("rejects bad actions / negative t", () => {
    expect(isReplayInput({ t: -1, a: "L" })).toBe(false);
    expect(isReplayInput({ t: 0, a: "X" })).toBe(false);
    expect(isReplayInput(null)).toBe(false);
  });
});

describe("parseReplayEntry", () => {
  it("accepts a full valid object", () => {
    const e = parseReplayEntry(validRaw);
    expect(e).not.toBeNull();
    expect(e!.id).toBe("r1");
    expect(e!.mode).toBe("endless");
    expect(e!.inputs).toEqual([{ t: 10, a: "L" }]);
  });

  it("rejects wrong version / missing settings", () => {
    expect(parseReplayEntry({ ...validRaw, v: 99 })).toBeNull();
    expect(parseReplayEntry({ ...validRaw, settings: null })).toBeNull();
    expect(parseReplayEntry(null)).toBeNull();
  });

  it("filters invalid inputs and clamps difficulty", () => {
    const e = parseReplayEntry({
      ...validRaw,
      difficulty: 99,
      inputs: [{ t: 1, a: "L" }, { t: -1, a: "R" }, { a: "CW" }],
    });
    expect(e!.difficulty).toBe(7);
    expect(e!.inputs).toEqual([{ t: 1, a: "L" }]);
  });

  it("normalizes non-positive multiplier to 1", () => {
    expect(parseReplayEntry({ ...validRaw, multiplier: 0 })!.multiplier).toBe(
      1,
    );
  });
});

describe("sortReplaysNewestFirst", () => {
  it("sorts by savedAt desc without mutating", () => {
    const a = parseReplayEntry({ ...validRaw, id: "a", savedAt: 1 })!;
    const b = parseReplayEntry({ ...validRaw, id: "b", savedAt: 3 })!;
    const c = parseReplayEntry({ ...validRaw, id: "c", savedAt: 2 })!;
    const list = [a, b, c];
    const sorted = sortReplaysNewestFirst(list);
    expect(sorted.map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(list[0].id).toBe("a");
  });
});
