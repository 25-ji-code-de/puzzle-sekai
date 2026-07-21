/**
 * Auth / gateway endpoints from Vite env.
 * client_id is public; never put a client_secret in the frontend.
 */

/** Strip a trailing slash from origin/base URLs. */
export const stripTrailingSlash = (url: string): string =>
  url.replace(/\/$/, "");

export const PASS_ISSUER = stripTrailingSlash(
  import.meta.env.VITE_SEKAI_PASS_ISSUER || "https://id.nightcord.de5.net",
);

export const PASS_CLIENT_ID = String(
  import.meta.env.VITE_SEKAI_PASS_CLIENT_ID || "",
).trim();

export const GATEWAY_BASE = stripTrailingSlash(
  import.meta.env.VITE_GATEWAY_BASE || "https://api.nightcord.de5.net",
);

export const SYNC_PROJECT = String(
  import.meta.env.VITE_SYNC_PROJECT || "pico",
).trim();

export const AUTH_STORAGE_KEY = "puzzleSekaiAuth";
export const SYNC_META_KEY = "puzzleSekaiSyncMeta";

/**
 * True when the bundle was built for a native shell (Tauri / Capacitor).
 * Set via VITE_NATIVE=1 in `.env.native` / `vite build --mode native`.
 */
export const isNativeBuild = (): boolean =>
  String(import.meta.env.VITE_NATIVE || "").trim() === "1";

/** Custom-scheme OAuth callback for native shells. Register this on the IdP. */
export const NATIVE_REDIRECT_URI = String(
  import.meta.env.VITE_NATIVE_REDIRECT_URI || "puzzlesekai://auth/callback",
).trim();

/**
 * Build a web redirect_uri from origin + pathname (pure).
 * Native shells do not use this — they use NATIVE_REDIRECT_URI.
 */
export const webRedirectUriFromLocation = (
  origin: string,
  pathname: string,
): string => {
  if (pathname.endsWith(".html")) {
    const dir = pathname.replace(/[^/]+$/, "");
    return `${origin}${dir}`;
  }
  const base = pathname.endsWith("/")
    ? pathname
    : pathname.replace(/[^/]*$/, "");
  return `${origin}${base || "/"}`;
};

/**
 * OAuth redirect_uri must match Pass applications.redirect_uris exactly.
 * Native shells use a fixed custom scheme; web uses the current page origin.
 */
export const redirectUri = (): string => {
  if (isNativeBuild()) return NATIVE_REDIRECT_URI;
  if (typeof window === "undefined") return "http://localhost:7426/";
  return webRedirectUriFromLocation(
    window.location.origin,
    window.location.pathname,
  );
};

export const isAuthConfigured = (): boolean => PASS_CLIENT_ID.length > 0;
