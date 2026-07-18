/**
 * Auth / gateway endpoints from Vite env.
 * client_id is public; never put a client_secret in the frontend.
 */
export const PASS_ISSUER = (
  import.meta.env.VITE_SEKAI_PASS_ISSUER || "https://id.nightcord.de5.net"
).replace(/\/$/, "");

export const PASS_CLIENT_ID = String(
  import.meta.env.VITE_SEKAI_PASS_CLIENT_ID || "",
).trim();

export const GATEWAY_BASE = (
  import.meta.env.VITE_GATEWAY_BASE || "https://api.nightcord.de5.net"
).replace(/\/$/, "");

export const SYNC_PROJECT = String(
  import.meta.env.VITE_SYNC_PROJECT || "pico",
).trim();

export const AUTH_STORAGE_KEY = "puzzleSekaiAuth";
export const SYNC_META_KEY = "puzzleSekaiSyncMeta";

/** OAuth redirect_uri must match Pass applications.redirect_uris exactly. */
export const redirectUri = (): string => {
  if (typeof window === "undefined") return "http://localhost:7426/";
  const { origin, pathname } = window.location;
  // Static site at root (or subpath). Prefer origin + directory of index.
  if (pathname.endsWith(".html")) {
    const dir = pathname.replace(/[^/]+$/, "");
    return `${origin}${dir}`;
  }
  // Ensure trailing slash for consistency with registered URIs.
  const base = pathname.endsWith("/")
    ? pathname
    : pathname.replace(/[^/]*$/, "");
  return `${origin}${base || "/"}`;
};

export const isAuthConfigured = (): boolean => PASS_CLIENT_ID.length > 0;
