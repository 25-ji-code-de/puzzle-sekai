/**
 * SEKAI Pass OAuth 2.1 + PKCE login for SPA.
 */
import {
  isAuthConfigured,
  PASS_CLIENT_ID,
  PASS_ISSUER,
  redirectUri,
} from "./config";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateNonce,
  generateState,
} from "./pkce";
import {
  clearPkcePending,
  clearSession,
  loadPkcePending,
  savePkcePending,
  saveSession,
  type AuthSession,
  type AuthUser,
} from "./session";
import { notifyAuthChanged } from "./user";

export type LoginStartResult =
  { ok: true } | { ok: false; reason: "not_configured" | "crypto" };

/** Redirect browser to SEKAI Pass authorize endpoint. */
export const startLogin = async (): Promise<LoginStartResult> => {
  if (!isAuthConfigured()) return { ok: false, reason: "not_configured" };
  try {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = generateState();
    const nonce = generateNonce();
    const redir = redirectUri();
    savePkcePending({ verifier, state, nonce, redirectUri: redir });

    const url = new URL(`${PASS_ISSUER}/oauth/authorize`);
    url.searchParams.set("client_id", PASS_CLIENT_ID);
    url.searchParams.set("redirect_uri", redir);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid profile");
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);

    window.location.assign(url.toString());
    return { ok: true };
  } catch (e) {
    console.warn("[auth] startLogin", e);
    return { ok: false, reason: "crypto" };
  }
};

export type CallbackResult =
  | { handled: false }
  | { handled: true; ok: true; session: AuthSession }
  | { handled: true; ok: false; error: string };

const clearAuthQuery = () => {
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

const fetchUserInfo = async (accessToken: string): Promise<AuthUser | null> => {
  try {
    const res = await fetch(`${PASS_ISSUER}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const id = String(data.sub || data.id || "");
    const username = String(
      data.preferred_username || data.username || data.name || id,
    );
    if (!id || !username) return null;
    return {
      id,
      username,
      email: data.email != null ? String(data.email) : undefined,
      displayName:
        data.name != null
          ? String(data.name)
          : data.display_name != null
            ? String(data.display_name)
            : undefined,
    };
  } catch {
    return null;
  }
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

  const pending = loadPkcePending();
  clearPkcePending();

  if (err) {
    clearAuthQuery();
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
  if (!pending || pending.state !== state) {
    clearAuthQuery();
    return { handled: true, ok: false, error: "state_mismatch" };
  }
  if (!PASS_CLIENT_ID) {
    clearAuthQuery();
    return { handled: true, ok: false, error: "not_configured" };
  }

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: PASS_CLIENT_ID,
      redirect_uri: pending.redirectUri,
      code_verifier: pending.verifier,
    });
    const res = await fetch(`${PASS_ISSUER}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      clearAuthQuery();
      return {
        handled: true,
        ok: false,
        error: `token_${res.status}${text ? `:${text.slice(0, 80)}` : ""}`,
      };
    }
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) {
      clearAuthQuery();
      return { handled: true, ok: false, error: "no_access_token" };
    }

    const user =
      (await fetchUserInfo(data.access_token)) ||
      ({
        id: "unknown",
        username: "user",
      } satisfies AuthUser);

    const session: AuthSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
      user,
    };
    saveSession(session);
    clearAuthQuery();
    notifyAuthChanged();
    return { handled: true, ok: true, session };
  } catch (e) {
    clearAuthQuery();
    console.warn("[auth] callback", e);
    return { handled: true, ok: false, error: "network" };
  }
};

export const logout = (): void => {
  clearSession();
  clearPkcePending();
  notifyAuthChanged();
};
