/**
 * Settings normalize / migrate unit tests.
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_SETTINGS,
  GAME_GROUPS,
  isSpeedLevel,
  isTimeAttackDuration,
  SETTINGS_VERSION,
} from "./types";
import { migrateSettingsPayload, normalizeSettings } from "./store";

describe("isSpeedLevel / isTimeAttackDuration", () => {
  it("accepts whitelist values only", () => {
    expect(isSpeedLevel(1)).toBe(true);
    expect(isSpeedLevel(5)).toBe(true);
    expect(isSpeedLevel(99)).toBe(false);
    expect(isSpeedLevel("3")).toBe(false);
    expect(isSpeedLevel(2.5)).toBe(false);
    expect(isSpeedLevel(0)).toBe(false);

    expect(isTimeAttackDuration(90)).toBe(true);
    expect(isTimeAttackDuration(99)).toBe(false);
    expect(isTimeAttackDuration("60")).toBe(false);
  });
});

describe("normalizeSettings", () => {
  it("returns defaults for empty / garbage", () => {
    const s = normalizeSettings(null);
    expect(s.speedLevel).toBe(DEFAULT_SETTINGS.speedLevel);
    expect(s.timeAttackDuration).toBe(DEFAULT_SETTINGS.timeAttackDuration);
    expect(s.selectedGroups).toEqual([...GAME_GROUPS]);
  });

  it("rejects illegal speed and duration", () => {
    const s = normalizeSettings({
      speedLevel: 99,
      timeAttackDuration: "3",
      itemDropRate: 10,
      spawnOrientation: "inverted",
    });
    expect(s.speedLevel).toBe(DEFAULT_SETTINGS.speedLevel);
    expect(s.timeAttackDuration).toBe(DEFAULT_SETTINGS.timeAttackDuration);
  });

  it("keeps valid speed and duration", () => {
    const s = normalizeSettings({
      speedLevel: 4,
      timeAttackDuration: 180,
    });
    expect(s.speedLevel).toBe(4);
    expect(s.timeAttackDuration).toBe(180);
  });

  it("clamps volumes and coerces lowPerformance", () => {
    const s = normalizeSettings({
      bgmVolume: 150,
      sfxVolume: -5,
      voiceVolume: "loud",
      lowPerformance: 1,
    });
    expect(s.bgmVolume).toBe(100);
    expect(s.sfxVolume).toBe(0);
    expect(s.voiceVolume).toBe(DEFAULT_SETTINGS.voiceVolume);
    expect(s.lowPerformance).toBe(false);

    expect(normalizeSettings({ lowPerformance: true }).lowPerformance).toBe(
      true,
    );
  });

  it("defaults invalid displayMode and keeps valid ones", () => {
    expect(normalizeSettings({}).displayMode).toBe("windowed");
    expect(normalizeSettings({ displayMode: "maximized" }).displayMode).toBe(
      "windowed",
    );
    expect(normalizeSettings({ displayMode: "borderless" }).displayMode).toBe(
      "borderless",
    );
    expect(normalizeSettings({ displayMode: "fullscreen" }).displayMode).toBe(
      "fullscreen",
    );
  });
});

describe("migrateSettingsPayload", () => {
  it("accepts legacy flat v0 without version", () => {
    const s = migrateSettingsPayload({
      speedLevel: 3,
      timeAttackDuration: 60,
      selectedGroups: [...GAME_GROUPS].slice(0, 3),
      itemDropRate: 15,
      spawnOrientation: "upright",
      bgmVolume: 80,
      sfxVolume: 80,
      voiceVolume: 80,
      lowPerformance: false,
      funModes: {},
    });
    expect(s.speedLevel).toBe(3);
    expect(s.timeAttackDuration).toBe(60);
    expect(s.itemDropRate).toBe(15);
    expect(s.spawnOrientation).toBe("upright");
    expect(s.selectedGroups).toHaveLength(3);
  });

  it("accepts v1 envelope and ignores version field for gameplay", () => {
    const s = migrateSettingsPayload({
      version: SETTINGS_VERSION,
      speedLevel: 5,
      timeAttackDuration: 120,
      selectedGroups: [...GAME_GROUPS],
      itemDropRate: 0,
      spawnOrientation: "inverted",
      bgmVolume: 50,
      sfxVolume: 50,
      voiceVolume: 50,
      lowPerformance: true,
      funModes: {},
    });
    expect(s.speedLevel).toBe(5);
    expect(s.timeAttackDuration).toBe(120);
    expect(s.lowPerformance).toBe(true);
    expect((s as { version?: number }).version).toBeUndefined();
  });

  it("best-effort normalizes unknown future version", () => {
    const s = migrateSettingsPayload({
      version: 99,
      speedLevel: 2,
      timeAttackDuration: 90,
    });
    expect(s.speedLevel).toBe(2);
    expect(s.timeAttackDuration).toBe(90);
  });
});
