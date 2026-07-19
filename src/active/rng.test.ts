/**
 * Character bag RNG — seeded sequence + group / Mikudayo filter.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { DEFAULT_SETTINGS, type GameSettings, type GroupName } from "../settings/types";
import { DEFAULT_FUN_MODES } from "../fun/modes";
import { CHAR } from "../characters/ids";
import { clearMatchRng } from "../domain/prng";

const mockSettings: GameSettings = {
  ...DEFAULT_SETTINGS,
  funModes: { ...DEFAULT_FUN_MODES },
  selectedGroups: [...DEFAULT_SETTINGS.selectedGroups] as GroupName[],
};

vi.mock("../settings", () => ({
  getCurrentSettings: () => mockSettings,
}));

import { initRNG, nextCharacter, randomCharacter } from "./rng";

beforeEach(() => {
  clearMatchRng();
  Object.assign(mockSettings, {
    ...DEFAULT_SETTINGS,
    funModes: { ...DEFAULT_FUN_MODES },
    selectedGroups: [...DEFAULT_SETTINGS.selectedGroups],
  });
});

describe("initRNG / randomCharacter seed", () => {
  it("same seed yields the same bag sequence", () => {
    initRNG(0x1234abcd);
    const a = Array.from({ length: 12 }, () => randomCharacter().name);

    initRNG(0x1234abcd);
    const b = Array.from({ length: 12 }, () => randomCharacter().name);

    expect(a).toEqual(b);
    expect(a.every((n) => typeof n === "string" && n.length > 0)).toBe(true);
  });

  it("different seeds diverge", () => {
    initRNG(1);
    const a = Array.from({ length: 8 }, () => randomCharacter().name);
    initRNG(2);
    const b = Array.from({ length: 8 }, () => randomCharacter().name);
    expect(a).not.toEqual(b);
  });

  it("returns the installed seed", () => {
    expect(initRNG(42)).toBe(42);
  });
});

describe("group filter", () => {
  it("only draws from selectedGroups", () => {
    mockSettings.selectedGroups = [
      "Leo/need",
      "Vivid BAD SQUAD",
      "MORE MORE JUMP!",
    ] as GroupName[];
    mockSettings.funModes = { ...DEFAULT_FUN_MODES, mikudayo: false };
    initRNG(7);
    const names = Array.from({ length: 40 }, () => randomCharacter());
    for (const c of names) {
      expect(c.group).not.toBe("Special");
      expect(mockSettings.selectedGroups).toContain(c.group);
    }
  });

  it("includes Mikudayo when funModes.mikudayo is on", () => {
    mockSettings.selectedGroups = [
      "Leo/need",
      "MORE MORE JUMP!",
      "Vivid BAD SQUAD",
    ] as GroupName[];
    mockSettings.funModes = { ...DEFAULT_FUN_MODES, mikudayo: true };
    initRNG(99);
    // draw enough to empty/refill bags multiple times
    const names = new Set(
      Array.from({ length: 200 }, () => randomCharacter().name),
    );
    expect(names.has(CHAR.Mikudayo)).toBe(true);
  });

  it("excludes Mikudayo when funModes.mikudayo is off", () => {
    mockSettings.selectedGroups = [
      "Leo/need",
      "MORE MORE JUMP!",
      "Vivid BAD SQUAD",
    ] as GroupName[];
    mockSettings.funModes = { ...DEFAULT_FUN_MODES, mikudayo: false };
    initRNG(99);
    const names = new Set(
      Array.from({ length: 200 }, () => randomCharacter().name),
    );
    expect(names.has(CHAR.Mikudayo)).toBe(false);
  });
});

describe("bag refill / nextCharacter", () => {
  it("keeps nextCharacter primed after init", () => {
    initRNG(3);
    expect(nextCharacter).toBeDefined();
    const first = randomCharacter();
    expect(first).toBeDefined();
    // next is pre-drawn for the following call
    expect(nextCharacter).toBeDefined();
  });

  it("throws on draw when filter yields an empty bag", () => {
    mockSettings.selectedGroups = [] as unknown as GroupName[];
    mockSettings.funModes = { ...DEFAULT_FUN_MODES, mikudayo: false };
    // init seeds nextCharacter = undefined (takeRandom on empty)
    expect(initRNG(1)).toBe(1);
    expect(() => randomCharacter()).toThrow(/character bag empty/);
  });
});
