/**
 * Thin wrappers around Tauri / Capacitor shell APIs.
 * Only loaded when VITE_NATIVE=1 so web bundles stay clean.
 *
 * Uses static-looking dynamic imports of known package names so Vite can
 * resolve them at build time.
 */

const devWarn = (msg: string, err?: unknown): void => {
  if (import.meta.env.DEV) {
    if (err !== undefined) console.warn(msg, err);
    else console.warn(msg);
  }
};

/** Open an https URL in the OS default browser (not the app webview). */
export const openExternalUrl = async (url: string): Promise<boolean> => {
  // Tauri 2 opener
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return true;
  } catch {
    /* not in Tauri, or plugin missing */
  }

  // Capacitor Browser plugin
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url, windowName: "_system" });
    return true;
  } catch {
    /* not Capacitor */
  }

  // Last resort
  try {
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  } catch (e) {
    console.warn("[native] openExternalUrl failed", e);
    return false;
  }
};

export type WindowDisplayMode = "windowed" | "borderless" | "fullscreen";

/**
 * Apply OS window chrome for a display mode.
 * No-op outside Tauri desktop (Capacitor / web keep their own chrome).
 */
export const applyWindowDisplayMode = async (
  mode: WindowDisplayMode,
): Promise<void> => {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    if (mode === "fullscreen") {
      await win.setFullscreen(true);
      await win.setDecorations(true);
      return;
    }
    await win.setFullscreen(false);
    if (mode === "borderless") {
      // Borderless "fullscreen" = undecorated + maximized
      await win.setDecorations(false);
      await win.maximize();
      return;
    }
    // windowed
    await win.setDecorations(true);
    try {
      await win.unmaximize();
    } catch {
      /* already windowed */
    }
  } catch (e) {
    devWarn("[native] applyWindowDisplayMode failed (or not Tauri)", e);
  }
};

/**
 * Capacitor Android: hide status + navigation bars (immersive sticky).
 * Safe no-op on web / Tauri / missing plugin.
 */
export const applyImmersiveSystemUi = async (): Promise<void> => {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform?.()) return;
    if (Capacitor.getPlatform?.() !== "android") return;
  } catch {
    return;
  }

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.hide();
    await StatusBar.setOverlaysWebView({ overlay: true });
    try {
      await StatusBar.setStyle({ style: Style.Dark });
    } catch {
      /* optional */
    }
  } catch (e) {
    console.warn("[native] StatusBar hide failed", e);
  }
};
