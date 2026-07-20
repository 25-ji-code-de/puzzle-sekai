/**
 * readStorageJsonFlag — pure-ish localStorage JSON field reader used at boot.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readStorageJsonFlag } from "./storage";

const KEY = "puzzleSekaiSettings_test_flag";

const store = new Map<string, string>();

const mockLocalStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => {
    store.set(k, String(v));
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  clear: () => {
    store.clear();
  },
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};

beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, "localStorage", {
    value: mockLocalStorage,
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  store.clear();
});

describe("readStorageJsonFlag", () => {
  it("returns fallback when key missing", () => {
    expect(readStorageJsonFlag(KEY, "lowPerformance")).toBe(false);
    expect(readStorageJsonFlag(KEY, "lowPerformance", true)).toBe(true);
  });

  it("reads true boolean field", () => {
    localStorage.setItem(KEY, JSON.stringify({ lowPerformance: true }));
    expect(readStorageJsonFlag(KEY, "lowPerformance")).toBe(true);
  });

  it("treats non-true as false", () => {
    localStorage.setItem(KEY, JSON.stringify({ lowPerformance: "yes" }));
    expect(readStorageJsonFlag(KEY, "lowPerformance")).toBe(false);
    localStorage.setItem(KEY, JSON.stringify({ lowPerformance: false }));
    expect(readStorageJsonFlag(KEY, "lowPerformance")).toBe(false);
  });

  it("returns fallback on invalid JSON", () => {
    localStorage.setItem(KEY, "{not-json");
    expect(readStorageJsonFlag(KEY, "lowPerformance", false)).toBe(false);
  });
});
