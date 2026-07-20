/**
 * Auth session persistence + freshness pure tests.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  loadSession,
  saveSession,
  clearSession,
  isSessionFresh,
  savePkcePending,
  loadPkcePending,
  clearPkcePending,
  PKCE_SESSION_KEY,
  type AuthSession,
} from "./session";
import { AUTH_STORAGE_KEY } from "./config";
import {
  localStoragePort,
  setStoragePort,
  type StoragePort,
} from "../settings/storage";

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

const session = (partial: Partial<AuthSession> = {}): AuthSession => ({
  accessToken: "at",
  refreshToken: "rt",
  expiresAt: Date.now() + 3600_000,
  user: { id: "u1", username: "miku", displayName: "Hatsune Miku" },
  ...partial,
});

let memory: ReturnType<typeof makeMemoryPort>;

beforeEach(() => {
  memory = makeMemoryPort();
  setStoragePort(memory);
});

afterEach(() => {
  setStoragePort(localStoragePort);
  vi.useRealTimers();
});

describe("save / load / clear session", () => {
  it("round-trips a valid session", () => {
    const s = session();
    saveSession(s);
    expect(memory.map.has(AUTH_STORAGE_KEY)).toBe(true);
    expect(loadSession()).toEqual(s);
  });

  it("rejects missing token / user fields", () => {
    memory.set(AUTH_STORAGE_KEY, JSON.stringify({ accessToken: "x" }));
    expect(loadSession()).toBeNull();
    memory.set(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        accessToken: "x",
        user: { id: "1" },
      }),
    );
    expect(loadSession()).toBeNull();
  });

  it("garbage JSON → null", () => {
    memory.set(AUTH_STORAGE_KEY, "{not-json");
    expect(loadSession()).toBeNull();
  });

  it("clearSession removes the key", () => {
    saveSession(session());
    clearSession();
    expect(loadSession()).toBeNull();
  });
});

describe("isSessionFresh", () => {
  it("true when expiresAt is beyond skew", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const s = session({ expiresAt: 1_000_000 + 120_000 });
    expect(isSessionFresh(s, 60_000)).toBe(true);
    expect(isSessionFresh(s, 180_000)).toBe(false);
  });

  it("false when already expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(5_000_000);
    expect(isSessionFresh(session({ expiresAt: 4_000_000 }))).toBe(false);
  });
});

describe("PKCE pending storage", () => {
  const pending = {
    verifier: "v",
    state: "s",
    nonce: "n",
    redirectUri: "puzzlesekai://auth/callback",
  };

  /** Minimal sessionStorage stand-in (vitest node has none). */
  const installSessionStorage = () => {
    const map = new Map<string, string>();
    const store = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, String(v));
      },
      removeItem: (k: string) => {
        map.delete(k);
      },
      clear: () => map.clear(),
      key: (i: number) => [...map.keys()][i] ?? null,
      get length() {
        return map.size;
      },
      map,
    };
    vi.stubGlobal("sessionStorage", store);
    return store;
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("round-trips via sessionStorage on web builds", () => {
    const ss = installSessionStorage();
    savePkcePending(pending);
    expect(loadPkcePending()).toEqual(pending);
    expect(ss.map.has(PKCE_SESSION_KEY)).toBe(true);
    // Web path must not touch StoragePort.
    expect(memory.map.has(PKCE_SESSION_KEY)).toBe(false);
    clearPkcePending();
    expect(loadPkcePending()).toBeNull();
  });

  it("round-trips via StoragePort when VITE_NATIVE=1", () => {
    vi.stubEnv("VITE_NATIVE", "1");
    installSessionStorage();
    savePkcePending(pending);
    expect(memory.map.has(PKCE_SESSION_KEY)).toBe(true);
    expect(loadPkcePending()).toEqual(pending);
    clearPkcePending();
    expect(loadPkcePending()).toBeNull();
    expect(memory.map.has(PKCE_SESSION_KEY)).toBe(false);
  });
});
