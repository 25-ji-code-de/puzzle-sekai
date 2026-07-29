/**
 * SEKAI Pass client — thin wiring over @25-ji-code-de/sekai-auth.
 *
 * Responsibilities:
 *   1. Map Vite env / native flags into SDK options
 *   2. One-shot migrate the legacy `puzzleSekaiAuth` JSON blob
 *   3. Keep StoragePort live so tests can swap the backend
 *   4. On native: CapacitorHttp + system-browser navigate + local PKCE store
 */
import {
  SekaiAuth,
  normalizeProfile,
  type SekaiProfile,
} from "@25-ji-code-de/sekai-auth";
import {
  AUTH_STORAGE_KEY,
  isNativeBuild,
  PASS_CLIENT_ID,
  PASS_ISSUER,
  redirectUri,
} from "./config";
import { getStoragePort, type StoragePort } from "../settings/storage";
import { devWarn } from "../util/dev-log";

/** Locked after first ship — never rename these. */
export const AUTH_STORAGE_PREFIX = "puzzle_sekai_";

/** Authenticate with OIDC and load the user's public profile. */
export const AUTH_SCOPE = "openid profile";

type AuthExpiredHandler = (error?: unknown) => void;
const authExpiredHandlers = new Set<AuthExpiredHandler>();

/** Register a listener for refresh-token death (SDK `onAuthExpired`). */
export const onAuthExpired = (fn: AuthExpiredHandler): (() => void) => {
  authExpiredHandlers.add(fn);
  return () => {
    authExpiredHandlers.delete(fn);
  };
};

const notifyAuthExpired = (error?: unknown): void => {
  for (const fn of authExpiredHandlers) {
    try {
      fn(error);
    } catch (e) {
      devWarn("[auth] onAuthExpired handler", e);
    }
  }
};

/**
 * Storage view that always reads the current StoragePort.
 * Tests call `setStoragePort` after module load; a snapshot would miss that.
 */
const livePortStorage = (port: () => StoragePort): Storage =>
  ({
    get length() {
      return port().keys().length;
    },
    clear() {
      for (const k of port().keys()) port().remove(k);
    },
    getItem(key: string) {
      return port().get(key);
    },
    setItem(key: string, value: string) {
      port().set(key, String(value));
    },
    removeItem(key: string) {
      port().remove(key);
    },
    key(index: number) {
      return port().keys()[index] ?? null;
    },
  }) as Storage;

/** In-memory Storage for environments without sessionStorage (vitest node). */
const memoryStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? (map.get(key) ?? null) : null;
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
    removeItem(key: string) {
      map.delete(key);
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
  } as Storage;
};

const webSessionStorage = (): Storage => {
  try {
    if (typeof sessionStorage !== "undefined") return sessionStorage;
  } catch {
    /* private mode */
  }
  return memoryStorage();
};

/**
 * PKCE must survive the OS-browser hop on native, so it lives on the same
 * durable store as tokens. Web keeps tab-scoped sessionStorage.
 */
const pkceStorage = (): Storage =>
  isNativeBuild() ? livePortStorage(getStoragePort) : webSessionStorage();

/**
 * Wrap native/http helpers as a fetch-shaped transport.
 * Only used when VITE_NATIVE=1 (opaque origins break IdP CORS).
 */
const nativeFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const url = String(input);
  const method = String(init?.method || "GET").toUpperCase();
  const headerBag = new Headers(init?.headers);
  const authorization = headerBag.get("Authorization") || "";
  const accessToken = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : undefined;

  const { postForm, getJson } = await import("../native/http");

  if (method === "POST") {
    let params: URLSearchParams;
    const body = init?.body;
    if (body instanceof URLSearchParams) {
      params = body;
    } else if (typeof body === "string") {
      params = new URLSearchParams(body);
    } else if (body == null) {
      params = new URLSearchParams();
    } else {
      params = new URLSearchParams(String(body));
    }
    const res = await postForm(url, params);
    return new Response(res.text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await getJson(url, accessToken);
  return new Response(res.text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
};

const nativeNavigate = async (url: string): Promise<void> => {
  const { openExternalUrl } = await import("../native/shell");
  const ok = await openExternalUrl(url);
  if (!ok) {
    // Last resort — better than failing silently (matches pre-SDK behavior).
    globalThis.location.assign(url);
  }
};

/**
 * Construct with a placeholder client id when unset so the module can load
 * in dev without env; `isAuthConfigured()` / `startLogin` still gate real use.
 */
export const auth = new SekaiAuth({
  clientId: PASS_CLIENT_ID || "unconfigured",
  redirectUri: redirectUri(),
  scope: AUTH_SCOPE,
  issuer: PASS_ISSUER,
  storagePrefix: AUTH_STORAGE_PREFIX,
  localStorage: livePortStorage(getStoragePort),
  sessionStorage: pkceStorage(),
  onAuthExpired: notifyAuthExpired,
  ...(isNativeBuild()
    ? { fetch: nativeFetch as typeof fetch, navigate: nativeNavigate }
    : {}),
});

/**
 * Keep `auth.redirectUri` aligned with the current page / native scheme.
 * Call before login and before callback exchange.
 */
export const syncRedirectUri = (): string => {
  const uri = redirectUri();
  auth.redirectUri = uri;
  return uri;
};

type LegacyBlob = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: {
    id?: string;
    username?: string;
    email?: string;
    displayName?: string;
  };
};

/**
 * One-shot: split the pre-SDK `puzzleSekaiAuth` JSON blob into discrete keys.
 * Without this, every existing session would be logged out on upgrade.
 */
export const migrateLegacyAuthBlob = (
  storage: StoragePort = getStoragePort(),
): void => {
  let raw: string | null;
  try {
    raw = storage.get(AUTH_STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  try {
    const legacy = JSON.parse(raw) as LegacyBlob;
    // Never let a stale leftover blob overwrite an already-migrated session.
    if (storage.get(auth.keys.accessToken)) {
      storage.remove(AUTH_STORAGE_KEY);
      return;
    }
    if (legacy.accessToken && legacy.expiresAt && legacy.user?.id) {
      storage.set(auth.keys.accessToken, legacy.accessToken);
      storage.set(auth.keys.expiresAt, String(legacy.expiresAt));
      if (legacy.refreshToken) {
        storage.set(auth.keys.refreshToken, legacy.refreshToken);
      }
      storage.set(
        auth.keys.user,
        JSON.stringify({
          sub: legacy.user.id,
          preferred_username: legacy.user.username,
          username: legacy.user.username,
          email: legacy.user.email,
          name: legacy.user.displayName,
          display_name: legacy.user.displayName,
        }),
      );
    }
  } catch {
    /* corrupt blob → treat as logged out */
  }

  try {
    storage.remove(AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

// Run once at module load. After migration the blob is gone, so re-imports are no-ops.
migrateLegacyAuthBlob();

/** Map SDK / userinfo shape onto the app's AuthUser. */
export const profileToAuthUser = (
  info: Record<string, unknown> | null,
): {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
} | null => {
  const profile: SekaiProfile | null = normalizeProfile(info);
  if (!profile?.sub) return null;
  const username =
    profile.username || profile.displayName || String(profile.sub);
  const email =
    info && typeof info.email === "string" && info.email
      ? info.email
      : undefined;
  // normalizeProfile deliberately falls displayName back to username for UI.
  // AuthUser historically distinguishes "no display name" from that fallback,
  // so only persist an explicit name claim here.
  const explicitDisplayName =
    info && typeof info.display_name === "string" && info.display_name.trim()
      ? info.display_name.trim()
      : info && typeof info.name === "string" && info.name.trim()
        ? info.name.trim()
        : undefined;
  return {
    id: profile.sub,
    username,
    ...(email ? { email } : {}),
    ...(explicitDisplayName ? { displayName: explicitDisplayName } : {}),
  };
};

export { normalizeProfile };
