/**
 * Match PRNG unit tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  mulberry32,
  initMatchRng,
  clearMatchRng,
  random,
  randomInt,
  chance,
  takeRandom,
  getMatchSeed,
} from "./prng";

describe("mulberry32", () => {
  it("is deterministic for the same seed", () => {
    const a = mulberry32(0x12345678);
    const b = mulberry32(0x12345678);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("diverges for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(Array.from({ length: 5 }, () => a())).not.toEqual(
      Array.from({ length: 5 }, () => b()),
    );
  });

  it("returns values in [0, 1)", () => {
    const r = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("match rng session", () => {
  beforeEach(() => {
    clearMatchRng();
  });

  it("initMatchRng returns and stores seed", () => {
    const seed = initMatchRng(0xdeadbeef);
    expect(seed).toBe(0xdeadbeef);
    expect(getMatchSeed()).toBe(0xdeadbeef);
  });

  it("same seed → same sequence via random/randomInt", () => {
    initMatchRng(99);
    const first = [random(), randomInt(10), chance(0.5), randomInt(3)];
    initMatchRng(99);
    const second = [random(), randomInt(10), chance(0.5), randomInt(3)];
    expect(first).toEqual(second);
  });

  it("takeRandom removes from list with seeded pick", () => {
    initMatchRng(7);
    const list = ["a", "b", "c", "d"];
    const picked = takeRandom(list);
    expect(picked).toBeDefined();
    expect(list).toHaveLength(3);
    expect(list.includes(picked!)).toBe(false);

    initMatchRng(7);
    const list2 = ["a", "b", "c", "d"];
    expect(takeRandom(list2)).toBe(picked);
  });

  it("randomInt clamps non-positive max; takeRandom on empty is undefined", () => {
    initMatchRng(1);
    expect(randomInt(0)).toBe(0);
    expect(randomInt(-5)).toBe(0);
    expect(takeRandom([])).toBeUndefined();
  });

  it("clearMatchRng forgets the seed", () => {
    initMatchRng(123);
    expect(getMatchSeed()).toBe(123);
    clearMatchRng();
    expect(getMatchSeed()).toBeUndefined();
  });
});
