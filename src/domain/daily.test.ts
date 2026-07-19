/**
 * Daily challenge date key + seed + locked rules.
 */
import { describe, it, expect } from "vitest";
import {
  dailyMatchSettings,
  dailySeed,
  defaultDailySettings,
  isUtcDateKey,
  utcDateKey,
  DAILY_GAMEPLAY_RULES,
} from "./daily";
import { DEFAULT_FUN_MODES } from "../fun/modes";
import {
  DEFAULT_SETTINGS,
  GAME_GROUPS,
  type GameSettings,
  type GroupName,
} from "../settings/types";
import { mulberry32 } from "./prng";

describe("utcDateKey", () => {
  it("formats UTC Y-M-D with zero padding", () => {
    // 2026-07-19T15:30:00Z
    expect(utcDateKey(new Date(Date.UTC(2026, 6, 19, 15, 30, 0)))).toBe(
      "2026-07-19",
    );
    expect(utcDateKey(new Date(Date.UTC(2026, 0, 5, 0, 0, 0)))).toBe(
      "2026-01-05",
    );
  });

  it("uses UTC even when local clock would be a different day", () => {
    // 2026-07-20 01:00 JST = 2026-07-19 16:00 UTC
    const localish = new Date("2026-07-19T16:00:00.000Z");
    expect(utcDateKey(localish)).toBe("2026-07-19");
  });
});

describe("isUtcDateKey", () => {
  it("accepts YYYY-MM-DD only", () => {
    expect(isUtcDateKey("2026-07-19")).toBe(true);
    expect(isUtcDateKey("2026-7-19")).toBe(false);
    expect(isUtcDateKey("")).toBe(false);
    expect(isUtcDateKey(null)).toBe(false);
  });
});

describe("dailySeed", () => {
  it("is stable for the same date key", () => {
    expect(dailySeed("2026-07-19")).toBe(dailySeed("2026-07-19"));
  });

  it("differs across consecutive days", () => {
    expect(dailySeed("2026-07-19")).not.toBe(dailySeed("2026-07-20"));
  });

  it("is a uint32", () => {
    const s = dailySeed("2026-07-19");
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xffffffff);
    expect(s).toBe(s >>> 0);
  });

  it("feeds mulberry32 the same stream for the same day", () => {
    const seed = dailySeed("2026-03-01");
    const a = mulberry32(seed);
    const b = mulberry32(seed);
    expect(Array.from({ length: 16 }, () => a())).toEqual(
      Array.from({ length: 16 }, () => b()),
    );
  });
});

describe("dailyMatchSettings", () => {
  it("locks gameplay fields and keeps presentation prefs", () => {
    const user: GameSettings = {
      ...DEFAULT_SETTINGS,
      speedLevel: 5,
      selectedGroups: [
        "Leo/need",
        "MORE MORE JUMP!",
        "Vivid BAD SQUAD",
      ] as GroupName[],
      funModes: { ...DEFAULT_FUN_MODES, mikudayo: true, truePhysics: true },
      itemDropRate: 30,
      spawnOrientation: "upright",
      bgmVolume: 40,
      sfxVolume: 55,
      voiceVolume: 70,
      lowPerformance: true,
      timeAttackDuration: 180,
    };
    const out = dailyMatchSettings(user);
    expect(out.speedLevel).toBe(DAILY_GAMEPLAY_RULES.speedLevel);
    expect(out.selectedGroups).toEqual([...GAME_GROUPS]);
    expect(out.funModes).toEqual(DEFAULT_FUN_MODES);
    expect(out.itemDropRate).toBe(10);
    expect(out.spawnOrientation).toBe("inverted");
    expect(out.bgmVolume).toBe(40);
    expect(out.sfxVolume).toBe(55);
    expect(out.voiceVolume).toBe(70);
    expect(out.lowPerformance).toBe(true);
    // user object not mutated
    expect(user.speedLevel).toBe(5);
    expect(user.funModes.mikudayo).toBe(true);
  });

  it("defaultDailySettings is a full GameSettings with locked rules", () => {
    const s = defaultDailySettings();
    expect(s.selectedGroups).toHaveLength(5);
    expect(s.funModes.mikudayo).toBe(false);
    expect(s.speedLevel).toBe(2);
  });
});
