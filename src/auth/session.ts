/**
 * Persist OAuth tokens + user profile (localStorage via StoragePort).
 * PKCE pending uses sessionStorage on web; localStorage on native shells so
 * custom-scheme OAuth hops do not drop the verifier/state.
 */
import { getStoragePort } from "../settings/storage";
import {
  AUTH_STORAGE_KEY,
  isNativeBuild,
  PASS_CLIENT_ID,
  PASS_ISSUER,
} from "./config";

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

export const PKCE_SESSION_KEY = "puzzleSekaiPkce";

export type PkcePending = {
  verifier: string;
  state: string;
  nonce: string;
  redirectUri: string;
};

const readPkceRaw = (): string | null => {
  if (isNativeBuild()) {
    return getStoragePort().get(PKCE_SESSION_KEY);
  }
  try {
    return sessionStorage.getItem(PKCE_SESSION_KEY);
  } catch {
    return null;
  }
};

const writePkceRaw = (raw: string): void => {
  if (isNativeBuild()) {
    getStoragePort().set(PKCE_SESSION_KEY, raw);
    return;
  }
  try {
    sessionStorage.setItem(PKCE_SESSION_KEY, raw);
  } catch {
    /* private mode */
  }
};

const removePkceRaw = (): void => {
  if (isNativeBuild()) {
    getStoragePort().remove(PKCE_SESSION_KEY);
    return;
  }
  try {
    sessionStorage.removeItem(PKCE_SESSION_KEY);
  } catch {
    /* ignore */
  }
};

export const savePkcePending = (p: PkcePending): void => {
  try {
    writePkceRaw(JSON.stringify(p));
  } catch {
    /* private mode / quota */
  }
};

export const loadPkcePending = (): PkcePending | null => {
  try {
    const raw = readPkceRaw();
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<PkcePending>;
    if (!o.verifier || !o.state || !o.redirectUri) return null;
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
    removePkceRaw();
  } catch {
    /* ignore */
  }
};

export const loadSession = (): AuthSession | null => {
  try {
    const raw = getStoragePort().get(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<AuthSession>;
    if (!o.accessToken || !o.user?.id || !o.user?.username) return null;
    return {
      accessToken: o.accessToken,
      refreshToken: o.refreshToken,
      expiresAt: Number(o.expiresAt) || 0,
      user: {
        id: o.user.id,
        username: o.user.username,
        email: o.user.email,
        displayName: o.user.displayName,
      },
    };
  } catch {
    return null;
  }
};

export const saveSession = (session: AuthSession): void => {
  try {
    getStoragePort().set(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn("[auth] save session failed", e);
  }
};

export const clearSession = (): void => {
  try {
    getStoragePort().remove(AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

export const isSessionFresh = (
  session: AuthSession,
  skewMs = 60_000,
): boolean => session.expiresAt - skewMs > Date.now();

/**
 * Return a usable access token, refreshing if needed.
 * Returns null if logged out or refresh fails.
 */
export const getAccessToken = async (): Promise<string | null> => {
  const session = loadSession();
  if (!session) return null;
  if (isSessionFresh(session)) return session.accessToken;
  if (!session.refreshToken || !PASS_CLIENT_ID) {
    clearSession();
    return null;
  }
  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
      client_id: PASS_CLIENT_ID,
    });
    const { postForm } = await import("../native/http");
    const res = await postForm(`${PASS_ISSUER}/oauth/token`, body);
    if (!res.ok) {
      clearSession();
      return null;
    }
    let data: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    try {
      data = res.json();
    } catch {
      clearSession();
      return null;
    }
    if (!data.access_token) {
      clearSession();
      return null;
    }
    const next: AuthSession = {
      ...session,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || session.refreshToken,
      expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    };
    saveSession(next);
    return next.accessToken;
  } catch (e) {
    console.warn("[auth] refresh failed", e);
    clearSession();
    return null;
  }
};
