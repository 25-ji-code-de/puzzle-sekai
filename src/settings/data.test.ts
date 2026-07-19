/**
 * clearAppData / clearAppCaches — StoragePort + Cache Storage isolation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { clearAppCaches, clearAppData } from "./data";
import { SETTINGS_KEY } from "./types";
import {
  localStoragePort,
  setStoragePort,
  type StoragePort,
} from "./storage";

const resetDefaults = vi.fn();

vi.mock("./store", () => ({
  resetCurrentSettingsToDefaults: () => resetDefaults(),
}));

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

let memory: ReturnType<typeof makeMemoryPort>;

beforeEach(() => {
  memory = makeMemoryPort();
  setStoragePort(memory);
  resetDefaults.mockClear();
});

afterEach(() => {
  setStoragePort(localStoragePort);
});

describe("clearAppData", () => {
  it("removes app keys and resets settings defaults", () => {
    memory.set(SETTINGS_KEY, "{}");
    memory.set("puzzleSekaiLocale", "zh");
    memory.set("puzzleSekaiDan", "{}");
    memory.set("puzzleSekaiSyncMeta", "{}");
    memory.set("hs:endless:4:std", '{"score":100}');
    memory.set("hs:timeAttack:90:3:ent", '{"score":50}');
    memory.set("highScore_endless", "9");
    memory.set("highScore_endless_difficulty", "3");
    memory.set("highScore_timeAttack_90", "1");
    // must survive
    memory.set("puzzleSekaiAuth", '{"accessToken":"x"}');
    memory.set("unrelated-key", "keep");

    clearAppData();

    expect(memory.map.has(SETTINGS_KEY)).toBe(false);
    expect(memory.map.has("puzzleSekaiLocale")).toBe(false);
    expect(memory.map.has("puzzleSekaiDan")).toBe(false);
    expect(memory.map.has("puzzleSekaiSyncMeta")).toBe(false);
    expect(memory.map.has("hs:endless:4:std")).toBe(false);
    expect(memory.map.has("hs:timeAttack:90:3:ent")).toBe(false);
    expect(memory.map.has("highScore_endless")).toBe(false);
    expect(memory.map.has("highScore_endless_difficulty")).toBe(false);
    expect(memory.map.has("highScore_timeAttack_90")).toBe(false);
    expect(memory.map.get("puzzleSekaiAuth")).toBe('{"accessToken":"x"}');
    expect(memory.map.get("unrelated-key")).toBe("keep");
    expect(resetDefaults).toHaveBeenCalledTimes(1);
  });

  it("still resets defaults when storage is empty", () => {
    clearAppData();
    expect(resetDefaults).toHaveBeenCalledTimes(1);
  });
});

describe("clearAppCaches", () => {
  afterEach(() => {
    // restore any stubbed caches
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).caches;
  });

  it("returns 0 when caches is undefined", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).caches;
    await expect(clearAppCaches()).resolves.toBe(0);
  });

  it("deletes every named cache and returns the count", async () => {
    const deleted: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).caches = {
      keys: async () => ["fonts", "audio", "rapier"],
      delete: async (name: string) => {
        deleted.push(name);
        return true;
      },
    };
    await expect(clearAppCaches()).resolves.toBe(3);
    expect(deleted.sort()).toEqual(["audio", "fonts", "rapier"]);
  });
});
