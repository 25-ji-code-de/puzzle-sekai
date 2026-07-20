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
    if (!url.startsWith("puzzlesekai:")) return false;
    return (
      url.includes("auth/callback") || url.includes(`//${OAUTH_CALLBACK_HOST}`)
    );
  } catch {
    return false;
  }
};

/**
 * Extract search params from a deep-link URL and run the existing OAuth
 * callback handler (without navigating the webview away from the app shell).
 */
export const injectOAuthCallback = (url: string): void => {
  try {
    const parsed = new URL(url);
    const qs = parsed.searchParams.toString();
    if (!qs) return;
    const next = `${window.location.pathname}?${qs}${window.location.hash || ""}`;
    window.history.replaceState({}, "", next);
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

const bindCapacitor = async (): Promise<DeepLinkUnlisten | null> => {
  try {
    const { App } = await import("@capacitor/app");
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

const bindTauri = async (): Promise<DeepLinkUnlisten | null> => {
  try {
    const { onOpenUrl, getCurrent } =
      await import("@tauri-apps/plugin-deep-link");
    const unlisten = await onOpenUrl((urls) => {
      for (const url of urls) {
        if (isOAuthCallbackUrl(url)) injectOAuthCallback(url);
      }
    });
    try {
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
 */
export const bootstrapNativeDeepLinks = async (): Promise<DeepLinkUnlisten> => {
  if (!isNativeBuild()) return () => {};
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
