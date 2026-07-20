/**
 * Native deep-link bootstrap (Tauri / Capacitor).
 * Routes OAuth custom-scheme callbacks into the same query-param path
 * that `handleRedirectCallback` already understands on web.
 *
 * Loaded only when `VITE_NATIVE=1` so the web bundle never pulls shell APIs.
 */
import { isNativeBuild } from "../auth/config";

const OAUTH_CALLBACK_HOST = "auth/callback";

/** True if URL is our OAuth custom-scheme callback. */
export const isOAuthCallbackUrl = (url: string): boolean => {
  try {
    // Custom schemes parse as `puzzlesekai://auth/callback?code=...`
    // → protocol puzzlesekai:, host auth, pathname /callback
    // or sometimes host empty + pathname //auth/callback
    if (!url.startsWith("puzzlesekai:")) return false;
    return (
      url.includes("auth/callback") || url.includes(`//${OAUTH_CALLBACK_HOST}`)
    );
  } catch {
    return false;
  }
};

/**
 * Extract search params from a deep-link URL and navigate the webview so
 * existing welcome bootstrap (`handleRedirectCallback`) runs unchanged.
 */
export const injectOAuthCallback = (url: string): void => {
  try {
    // URL with custom scheme: new URL("puzzlesekai://auth/callback?code=x&state=y")
    const parsed = new URL(url);
    const qs = parsed.searchParams.toString();
    if (!qs) return;
    // Stay on the app shell; only replace the query string.
    const next = `${window.location.pathname}?${qs}${window.location.hash || ""}`;
    window.history.replaceState({}, "", next);
    // Force welcome bootstrap to re-run if it already finished with no params.
    void import("../auth").then(async ({ handleRedirectCallback }) => {
      const cb = await handleRedirectCallback();
      if (cb.handled && cb.ok) {
        const { pullMergePush } = await import("../sync");
        void pullMergePush();
      }
    });
  } catch (e) {
    console.warn("[native] injectOAuthCallback", e);
  }
};

type DeepLinkUnlisten = () => void;

/**
 * Runtime-only dynamic import so tsc does not require shell packages at
 * compile time, and web builds never pull them into the graph (this module
 * is only loaded when VITE_NATIVE=1).
 */
const importShell = async (
  specifier: string,
): Promise<Record<string, unknown> | null> => {
  try {
    // Variable specifier + Function avoids TS "literal-only dynamic import".
    const load = new Function("s", "return import(/* @vite-ignore */ s)") as (
      s: string,
    ) => Promise<unknown>;
    const mod: unknown = await load(specifier);
    return mod && typeof mod === "object"
      ? (mod as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const bindCapacitor = async (): Promise<DeepLinkUnlisten | null> => {
  try {
    const mod = await importShell("@capacitor/app");
    const App = mod?.App as
      | {
          addListener: (
            event: string,
            cb: (e: { url: string }) => void,
          ) => Promise<{ remove: () => void | Promise<void> }>;
          getLaunchUrl?: () => Promise<{ url?: string } | undefined>;
        }
      | undefined;
    if (!App) return null;
    const handle = await App.addListener("appUrlOpen", (event) => {
      if (isOAuthCallbackUrl(event.url)) injectOAuthCallback(event.url);
    });
    try {
      const launch = await App.getLaunchUrl?.();
      if (launch?.url && isOAuthCallbackUrl(launch.url)) {
        injectOAuthCallback(launch.url);
      }
    } catch {
      /* older plugin */
    }
    return () => {
      void handle.remove();
    };
  } catch (e) {
    console.warn("[native] Capacitor deep-link bind failed", e);
    return null;
  }
};

/**
 * Tauri 2: tauri-plugin-deep-link onOpenUrl.
 */
const bindTauri = async (): Promise<DeepLinkUnlisten | null> => {
  try {
    const mod = await importShell("@tauri-apps/plugin-deep-link");
    const onOpenUrl = mod?.onOpenUrl as
      ((cb: (urls: string[]) => void) => Promise<() => void>) | undefined;
    if (!onOpenUrl) return null;
    const unlisten = await onOpenUrl((urls) => {
      for (const url of urls) {
        if (isOAuthCallbackUrl(url)) injectOAuthCallback(url);
      }
    });
    try {
      const getCurrent = mod?.getCurrent as
        (() => Promise<string[] | null>) | undefined;
      const current = await getCurrent?.();
      if (Array.isArray(current)) {
        for (const url of current) {
          if (isOAuthCallbackUrl(url)) injectOAuthCallback(url);
        }
      }
    } catch {
      /* optional */
    }
    return typeof unlisten === "function" ? unlisten : () => {};
  } catch (e) {
    console.warn("[native] Tauri deep-link bind failed", e);
    return null;
  }
};

/**
 * Call once at boot when `VITE_NATIVE=1`. Safe no-op on web builds.
 * Returns an unlisten that tears down both shell listeners.
 */
export const bootstrapNativeDeepLinks = async (): Promise<DeepLinkUnlisten> => {
  if (!isNativeBuild()) return () => {};
  // Also handle the case where the webview itself was opened with the
  // custom-scheme URL already in location (rare, but free to support).
  if (isOAuthCallbackUrl(window.location.href)) {
    injectOAuthCallback(window.location.href);
  }
  const [capUnlisten, tauriUnlisten] = await Promise.all([
    bindCapacitor(),
    bindTauri(),
  ]);
  return () => {
    capUnlisten?.();
    tauriUnlisten?.();
  };
};
