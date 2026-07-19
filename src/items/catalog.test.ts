/**
 * Item catalog predicate / bag pure tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  CARROT_ITEMS,
  FRIES_ITEMS,
  getRandomItem,
  isCarrotItem,
  isFriesItem,
  items,
} from "./catalog";
import { clearMatchRng, initMatchRng } from "../domain/prng";

describe("isCarrotItem / isFriesItem", () => {
  it("matches import URL equality", () => {
    expect(CARROT_ITEMS.length).toBe(2);
    for (const c of CARROT_ITEMS) {
      expect(isCarrotItem(c)).toBe(true);
      expect(isFriesItem(c)).toBe(false);
    }
    expect(FRIES_ITEMS.length).toBeGreaterThan(0);
    for (const f of FRIES_ITEMS) {
      expect(isFriesItem(f)).toBe(true);
      expect(isCarrotItem(f)).toBe(false);
    }
  });

  it("carrot also matches path substrings", () => {
    expect(isCarrotItem("/cdn/material008.abc123.webp")).toBe(true);
    expect(isCarrotItem("MATERIAL013.png")).toBe(true);
    expect(isCarrotItem("")).toBe(false);
    expect(isCarrotItem("material999.png")).toBe(false);
  });
});

describe("items bag", () => {
  beforeEach(() => {
    clearMatchRng();
  });

  it("flat list includes carrots and fries", () => {
    expect(items.length).toBeGreaterThan(FRIES_ITEMS.length);
    for (const c of CARROT_ITEMS) {
      expect(items).toContain(c);
    }
  });

  it("getRandomItem is deterministic under match PRNG", () => {
    initMatchRng(42);
    const a = [getRandomItem(), getRandomItem(), getRandomItem()];
    initMatchRng(42);
    const b = [getRandomItem(), getRandomItem(), getRandomItem()];
    expect(a).toEqual(b);
    for (const file of a) {
      expect(items).toContain(file);
    }
  });
});
