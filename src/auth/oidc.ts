/**
 * SEKAI Pass OAuth 2.1 + PKCE login façade.
 *
 * Implementation lives in @25-ji-code-de/sekai-auth; this file preserves the
 * pre-SDK call shapes (startLogin / handleRedirectCallback / logout) so UI,
 * sync, and native deep-link code do not churn.
 */
import { SekaiAuthError } from "@25-ji-code-de/sekai-auth";
import { isAuthConfigured } from "./config";
import { auth, profileToAuthUser, syncRedirectUri } from "./client";
import {
  clearPkcePending,
  clearSession,
  saveSession,
  type AuthSession,
  type AuthUser,
} from "./session";
import { notifyAuthChanged } from "./user";
import { getStoragePort } from "../settings/storage";
import { devWarn } from "../util/dev-log";

export type LoginStartResult =
  { ok: true } | { ok: false; reason: "not_configured" | "crypto" };

/** Redirect browser (or native OS browser) to SEKAI Pass authorize endpoint. */
export const startLogin = async (): Promise<LoginStartResult> => {
  if (!isAuthConfigured()) return { ok: false, reason: "not_configured" };
  try {
    syncRedirectUri();
    await auth.login();
    return { ok: true };
  } catch (e) {
    devWarn("[auth] startLogin", e);
    return { ok: false, reason: "crypto" };
  }
};

export type CallbackResult =
  | { handled: false }
  | { handled: true; ok: true; session: AuthSession }
  | { handled: true; ok: false; error: string };

const clearAuthQuery = (): void => {
  try {
    const u = new URL(window.location.href);
    if (
      !u.searchParams.has("code") &&
      !u.searchParams.has("state") &&
      !u.searchParams.has("error")
    ) {
      return;
    }
    u.searchParams.delete("code");
    u.searchParams.delete("state");
    u.searchParams.delete("error");
    u.searchParams.delete("error_description");
    const qs = u.searchParams.toString();
    const next = `${u.pathname}${qs ? `?${qs}` : ""}${u.hash}`;
    window.history.replaceState({}, "", next);
  } catch {
    /* ignore */
  }
};

const errorCodeOf = (err: unknown): string => {
  if (err instanceof SekaiAuthError)
    return err.code || err.message || "auth_error";
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string" && code) return code;
  }
  if (err instanceof Error && err.message) return err.message;
  return "network";
};

/**
 * If URL has OAuth callback params, exchange code for tokens.
 * Safe to call on every boot.
 */
export const handleRedirectCallback = async (): Promise<CallbackResult> => {
  if (typeof window === "undefined") return { handled: false };

  const params = new URLSearchParams(window.location.search);
  const err = params.get("error");
  const code = params.get("code");
  const state = params.get("state");

  if (!err && !code) return { handled: false };

  if (err) {
    clearAuthQuery();
    clearPkcePending();
    return {
      handled: true,
      ok: false,
      error: params.get("error_description") || err,
    };
  }

  if (!code || !state) {
    clearAuthQuery();
    return { handled: true, ok: false, error: "missing_code" };
  }
  if (!isAuthConfigured()) {
    clearAuthQuery();
    return { handled: true, ok: false, error: "not_configured" };
  }

  try {
    syncRedirectUri();
    const tokens = await auth.handleCallback(code, state);

    // SDK validates id_token when present. We requested openid, so missing
    // id_token is a protocol failure.
    if (auth.scope.split(/\s+/).includes("openid") && !tokens.id_token) {
      clearSession();
      clearAuthQuery();
      return { handled: true, ok: false, error: "no_id_token" };
    }

    const userInfo = await auth.getUserInfo({ cache: true });
    const mapped = profileToAuthUser(userInfo);
    const user: AuthUser = mapped ?? {
      id: "unknown",
      username: "user",
    };

    // Ensure discrete keys + user cache are coherent for loadSession().
    const expiresAt = Number(
      getStoragePortSafe(auth.keys.expiresAt) ?? Date.now() + 3600 * 1000,
    );
    const session: AuthSession = {
      accessToken:
        getStoragePortSafe(auth.keys.accessToken) || tokens.access_token,
      refreshToken: getStoragePortSafe(auth.keys.refreshToken) || undefined,
      expiresAt,
      user,
    };
    saveSession(session);
    clearAuthQuery();
    clearPkcePending();
    notifyAuthChanged();
    return { handled: true, ok: true, session };
  } catch (e) {
    clearAuthQuery();
    clearPkcePending();
    devWarn("[auth] callback", e);
    return { handled: true, ok: false, error: errorCodeOf(e) };
  }
};

const getStoragePortSafe = (key: string): string | null => {
  try {
    return getStoragePort().get(key);
  } catch {
    return null;
  }
};

/** Local clear + best-effort RFC 7009 revoke. */
export const logout = (): void => {
  clearPkcePending();
  // auth.logout reads both tokens before its first await, so starting it before
  // the local clear preserves best-effort revoke without delaying the UI.
  void auth
    .logout({ revoke: true })
    .catch((e) => devWarn("[auth] logout revoke", e));
  clearSession();
  notifyAuthChanged();
};
