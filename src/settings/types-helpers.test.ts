/**
 * Settings type helpers / group color pure tests.
 */
import { describe, it, expect } from "vitest";
import {
  GAME_GROUPS,
  GROUP_COLORS,
  GROUP_LABELS,
  getGroupColor,
  getGroupDisplayColor,
  isItemDropRate,
  isSpawnOrientation,
  isDisplayMode,
  isSpeedLevel,
  isTimeAttackDuration,
} from "./types";

describe("type guards", () => {
  it("isSpawnOrientation", () => {
    expect(isSpawnOrientation("inverted")).toBe(true);
    expect(isSpawnOrientation("upright")).toBe(true);
    expect(isSpawnOrientation("sideways")).toBe(false);
    expect(isSpawnOrientation(null)).toBe(false);
  });

  it("isDisplayMode whitelist", () => {
    expect(isDisplayMode("windowed")).toBe(true);
    expect(isDisplayMode("borderless")).toBe(true);
    expect(isDisplayMode("fullscreen")).toBe(true);
    expect(isDisplayMode("maximized")).toBe(false);
    expect(isDisplayMode(null)).toBe(false);
  });

  it("isItemDropRate whitelist", () => {
    expect(isItemDropRate(0)).toBe(true);
    expect(isItemDropRate(10)).toBe(true);
    expect(isItemDropRate(30)).toBe(true);
    expect(isItemDropRate(7)).toBe(false);
    expect(isItemDropRate("10")).toBe(false);
  });

  it("isSpeedLevel / isTimeAttackDuration integers only", () => {
    expect(isSpeedLevel(3)).toBe(true);
    expect(isSpeedLevel(3.5)).toBe(false);
    expect(isTimeAttackDuration(120)).toBe(true);
    expect(isTimeAttackDuration(100)).toBe(false);
  });
});

describe("group colors / labels", () => {
  it("covers every official group", () => {
    for (const g of GAME_GROUPS) {
      expect(GROUP_LABELS[g]).toBeTruthy();
      expect(GROUP_COLORS[g]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(getGroupColor(g)).toBe(GROUP_COLORS[g]);
    }
  });

  it("unknown group falls back to white", () => {
    expect(getGroupColor("Unknown Unit")).toBe("#ffffff");
  });

  it("display color lightens brand for dark UI", () => {
    const base = getGroupColor("Leo/need");
    const display = getGroupDisplayColor("Leo/need");
    expect(display).not.toBe(base);
    expect(display).toMatch(/^#[0-9a-f]{6}$/i);
    // lightened channels should not decrease
    const baseN = parseInt(base.slice(1), 16);
    const dispN = parseInt(display.slice(1), 16);
    expect((dispN >> 16) & 255).toBeGreaterThanOrEqual((baseN >> 16) & 255);
  });
});
