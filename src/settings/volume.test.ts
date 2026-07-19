/**
 * Volume channel helper tests.
 */
import { describe, it, expect } from "vitest";
import {
  bgmVol,
  clampVolumePercent,
  getVolumeScale,
  scaleVolume,
  sfxVol,
  voiceVol,
} from "./volume";
import { DEFAULT_SETTINGS, type GameSettings } from "./types";
import { DEFAULT_FUN_MODES } from "../fun/modes";

const settings = (partial: Partial<GameSettings> = {}): GameSettings => ({
  ...DEFAULT_SETTINGS,
  funModes: { ...DEFAULT_FUN_MODES },
  selectedGroups: [...DEFAULT_SETTINGS.selectedGroups],
  ...partial,
});

describe("clampVolumePercent", () => {
  it("clamps and rounds finite numbers", () => {
    expect(clampVolumePercent(50)).toBe(50);
    expect(clampVolumePercent(150)).toBe(100);
    expect(clampVolumePercent(-3)).toBe(0);
    expect(clampVolumePercent(33.6)).toBe(34);
  });

  it("invalid values fall back", () => {
    expect(clampVolumePercent(undefined, 80)).toBe(80);
    expect(clampVolumePercent("50" as unknown as number)).toBe(100);
    expect(clampVolumePercent(Number.NaN, 40)).toBe(40);
    expect(clampVolumePercent(Number.POSITIVE_INFINITY, 10)).toBe(10);
  });
});

describe("getVolumeScale / scaleVolume", () => {
  it("maps channel percent to 0–1 gain", () => {
    const s = settings({ bgmVolume: 50, sfxVolume: 0, voiceVolume: 100 });
    expect(getVolumeScale("bgm", s)).toBe(0.5);
    expect(getVolumeScale("sfx", s)).toBe(0);
    expect(getVolumeScale("voice", s)).toBe(1);
  });

  it("scaleVolume multiplies base by channel gain", () => {
    const s = settings({ sfxVolume: 50 });
    expect(scaleVolume("sfx", 0.4, s)).toBeCloseTo(0.2);
  });

  it("channel helpers match scaleVolume", () => {
    const s = settings({ bgmVolume: 80, sfxVolume: 25, voiceVolume: 10 });
    expect(bgmVol(0.3, s)).toBeCloseTo(0.3 * 0.8);
    expect(sfxVol(0.65, s)).toBeCloseTo(0.65 * 0.25);
    expect(voiceVol(1, s)).toBeCloseTo(0.1);
  });
});
