/**
 * Auth snapshot / display-name helper tests.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  displayNameOf,
  getAuthSnapshot,
  notifyAuthChanged,
  onAuthChange,
} from "./user";
import { clearSession, saveSession, type AuthUser } from "./session";
import {
  localStoragePort,
  setStoragePort,
  type StoragePort,
} from "../settings/storage";

const makeMemoryPort = (): StoragePort => {
  const map = new Map<string, string>();
  return {
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

beforeEach(() => {
  setStoragePort(makeMemoryPort());
  clearSession();
});

afterEach(() => {
  setStoragePort(localStoragePort);
});

describe("displayNameOf", () => {
  it("prefers trimmed displayName over username", () => {
    const user: AuthUser = {
      id: "1",
      username: "ichika",
      displayName: "  星乃一歌  ",
    };
    expect(displayNameOf(user)).toBe("星乃一歌");
  });

  it("falls back to username; empty for null", () => {
    expect(displayNameOf({ id: "1", username: "saki" })).toBe("saki");
    expect(
      displayNameOf({ id: "1", username: "saki", displayName: "   " }),
    ).toBe("saki");
    expect(displayNameOf(null)).toBe("");
  });
});

describe("auth snapshot + listeners", () => {
  it("loggedOut when no session", () => {
    expect(getAuthSnapshot()).toEqual({ loggedIn: false, user: null });
  });

  it("loggedIn reflects saved session user", () => {
    saveSession({
      accessToken: "t",
      expiresAt: Date.now() + 60_000,
      user: { id: "u", username: "an" },
    });
    expect(getAuthSnapshot()).toEqual({
      loggedIn: true,
      user: { id: "u", username: "an" },
    });
  });

  it("onAuthChange notifies and unsubscribe stops", () => {
    const fn = vi.fn();
    const off = onAuthChange(fn);
    notifyAuthChanged();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0]![0]).toEqual({ loggedIn: false, user: null });
    off();
    notifyAuthChanged();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
