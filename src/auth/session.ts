/**
 * Auth session façade over sekai-auth discrete storage keys.
 *
 * Keeps the AuthSession / AuthUser shapes the rest of the app already uses.
 * Token refresh is owned by the SDK (5 min skew, single-flight).
 */
import { auth, migrateLegacyAuthBlob, profileToAuthUser } from "./client";
import { AUTH_STORAGE_KEY, isNativeBuild } from "./config";
import { getStoragePort } from "../settings/storage";
import { devWarn } from "../util/dev-log";
import { safeJsonParse } from "../util/json";
import { toNonNegInt } from "../util/number";

export type AuthUser = {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  /** epoch ms when access token should be considered expired */
  expiresAt: number;
  user: AuthUser;
};

/** @deprecated PKCE is owned by sekai-auth; kept only so old imports typecheck during migration. */
export const PKCE_SESSION_KEY = "puzzleSekaiPkce";

/** @deprecated */
export type PkcePending = {
  verifier: string;
  state: string;
  nonce: string;
  redirectUri: string;
};

const userFromCache = (): AuthUser | null => {
  const cached = auth.getCachedUser();
  return profileToAuthUser(cached);
};

/**
 * Read the current session from discrete SDK keys.
 * Runs the legacy blob migrator first so cold boots after upgrade still work
 * if something imported session before client.ts finished its side effect.
 */
export const loadSession = (): AuthSession | null => {
  try {
    migrateLegacyAuthBlob();
    const accessToken = getStoragePort().get(auth.keys.accessToken);
    if (!accessToken) return null;
    const user = userFromCache();
    if (!user) return null;
    const refreshToken =
      getStoragePort().get(auth.keys.refreshToken) ?? undefined;
    const expiresAt = toNonNegInt(
      Number(getStoragePort().get(auth.keys.expiresAt) ?? 0),
    );
    return {
      accessToken,
      refreshToken: refreshToken || undefined,
      expiresAt,
      user,
    };
  } catch {
    return null;
  }
};

/**
 * Write a session into SDK discrete keys.
 * Used by tests and (rarely) by code that already has a full AuthSession.
 */
export const saveSession = (session: AuthSession): void => {
  try {
    const storage = getStoragePort();
    storage.set(auth.keys.accessToken, session.accessToken);
    storage.set(auth.keys.expiresAt, String(session.expiresAt));
    if (session.refreshToken) {
      storage.set(auth.keys.refreshToken, session.refreshToken);
    } else {
      storage.remove(auth.keys.refreshToken);
    }
    storage.set(
      auth.keys.user,
      JSON.stringify({
        sub: session.user.id,
        preferred_username: session.user.username,
        username: session.user.username,
        email: session.user.email,
        name: session.user.displayName,
        display_name: session.user.displayName,
      }),
    );
    // Drop any leftover legacy blob so loadSession doesn't thrash.
    storage.remove(AUTH_STORAGE_KEY);
  } catch (e) {
    devWarn("[auth] save session failed", e);
  }
};

export const clearSession = (): void => {
  try {
    const storage = getStoragePort();
    storage.remove(auth.keys.accessToken);
    storage.remove(auth.keys.refreshToken);
    storage.remove(auth.keys.expiresAt);
    storage.remove(auth.keys.user);
    storage.remove(AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

/**
 * @deprecated Refresh skew is owned by the SDK (REFRESH_SKEW_MS = 5 min).
 * Kept for any residual callers / tests.
 */
export const isSessionFresh = (
  session: AuthSession,
  skewMs = 60_000,
): boolean => session.expiresAt - skewMs > Date.now();

/** Return a usable access token, refreshing if needed. */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    migrateLegacyAuthBlob();
    return await auth.getAccessToken();
  } catch (e) {
    devWarn("[auth] getAccessToken failed", e);
    return null;
  }
};

/* ── PKCE pending: no longer used by the login path. ───────────────
 * Retained as thin no-op / best-effort cleaners so deep-link / logout
 * call sites and any residual imports keep compiling. New code must
 * not call these.
 */

export const savePkcePending = (p: PkcePending): void => {
  // Best-effort write in the old shape so a mid-deploy tab isn't worse off.
  try {
    const raw = JSON.stringify(p);
    if (isNativeBuild()) {
      getStoragePort().set(PKCE_SESSION_KEY, raw);
    } else if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(PKCE_SESSION_KEY, raw);
    }
  } catch {
    /* ignore */
  }
};

export const loadPkcePending = (): PkcePending | null => {
  try {
    const raw = isNativeBuild()
      ? getStoragePort().get(PKCE_SESSION_KEY)
      : typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem(PKCE_SESSION_KEY)
        : null;
    if (!raw) return null;
    const o = safeJsonParse<Partial<PkcePending>>(raw);
    if (!o?.verifier || !o.state || !o.redirectUri) return null;
    return {
      verifier: o.verifier,
      state: o.state,
      nonce: o.nonce || "",
      redirectUri: o.redirectUri,
    };
  } catch {
    return null;
  }
};

export const clearPkcePending = (): void => {
  try {
    if (isNativeBuild()) {
      const storage = getStoragePort();
      storage.remove(PKCE_SESSION_KEY);
      storage.remove(auth.keys.codeVerifier);
      storage.remove(auth.keys.state);
      storage.remove(auth.keys.nonce);
    } else if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(PKCE_SESSION_KEY);
      sessionStorage.removeItem(auth.keys.codeVerifier);
      sessionStorage.removeItem(auth.keys.state);
      sessionStorage.removeItem(auth.keys.nonce);
    }
  } catch {
    /* ignore */
  }
};
