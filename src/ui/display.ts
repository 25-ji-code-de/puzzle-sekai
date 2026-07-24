/**
 * Display helpers: orientation detection, rotate-to-landscape gate,
 * best-effort fullscreen + Screen Orientation lock on game start (mobile).
 */
import { isFullscreenOn, isPortraitWith } from "./display-policy";
import { devWarn } from "../util/dev-log";

const ROTATE_OVERLAY_ID = "rotate-landscape-overlay";

export const isPortrait = (): boolean =>
  typeof window !== "undefined" &&
  isPortraitWith(window.matchMedia?.bind(window));

/** True when the document is currently in a fullscreen element. */
export const isFullscreen = (): boolean => {
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    msFullscreenElement?: Element | null;
  };
  return isFullscreenOn(doc);
};

type OrientationWithLock = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};

/**
 * Prefer landscape lock on touch / phone-like viewports.
 * Desktop usually rejects lock; skip the noisy attempt when clearly a mouse UI.
 */
export const shouldLockLandscape = (
  matchMedia:
    ((q: string) => { matches: boolean }) | undefined = typeof window !==
  "undefined"
    ? window.matchMedia?.bind(window)
    : undefined,
): boolean => {
  if (!matchMedia) return false;
  try {
    // Primary: phones / tablets (no hover, coarse pointer).
    if (matchMedia("(hover: none) and (pointer: coarse)").matches) return true;
    // Fallback: narrow viewport (foldables / hybrid).
    if (matchMedia("(max-width: 900px)").matches) return true;
  } catch {
    /* ignore */
  }
  return false;
};

/**
 * Best-effort Screen Orientation API lock to landscape.
 * Must run after (or with) a user gesture; most browsers also require fullscreen.
 * Rejects quietly on iOS Safari / unsupported desktop.
 */
export const lockLandscapeOrientation = async (): Promise<boolean> => {
  if (typeof screen === "undefined" || !screen.orientation) return false;
  if (!shouldLockLandscape()) return false;
  const o = screen.orientation as OrientationWithLock;
  if (typeof o.lock !== "function") return false;
  try {
    await o.lock("landscape");
    return true;
  } catch (e1) {
    // Some Android builds only accept primary/secondary, not the generic token.
    try {
      await o.lock!("landscape-primary");
      return true;
    } catch (e2) {
      devWarn("Orientation lock failed:", { first: e1, second: e2 });
    }
  }
  return false;
};

/** Release orientation lock (e.g. return to menu). No-op when not locked. */
export const unlockOrientation = (): void => {
  if (typeof screen === "undefined" || !screen.orientation) return;
  const o = screen.orientation as OrientationWithLock;
  try {
    o.unlock?.();
  } catch (e) {
    devWarn("Orientation unlock failed:", e);
  }
};

/**
 * Request fullscreen on the document element, then try landscape orientation
 * lock (mobile). Must be called from a user-gesture handler (click / tap).
 * Best-effort: rejects quietly when the browser blocks either step.
 */
export const requestAppFullscreen = async (): Promise<boolean> => {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
  };
  let ok = false;
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      ok = true;
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      ok = true;
    } else if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
      ok = true;
    }
  } catch (e) {
    devWarn("Fullscreen request failed:", e);
  }

  // Orientation lock is much more reliable *after* fullscreen on Chromium /
  // Android. Still best-effort if fullscreen was denied (some PWAs allow lock alone).
  // Keep this in the same async chain started by the click handler.
  await lockLandscapeOrientation();
  return ok;
};

const ensureOverlay = (message: string): HTMLDivElement => {
  let overlay = document.getElementById(
    ROTATE_OVERLAY_ID,
  ) as HTMLDivElement | null;
  if (overlay) {
    const text = overlay.querySelector("[data-rotate-msg]");
    if (text) text.textContent = message;
    return overlay;
  }

  overlay = document.createElement("div");
  overlay.id = ROTATE_OVERLAY_ID;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-live", "polite");

  const icon = document.createElement("div");
  icon.className = "rotate-gate__icon";
  icon.setAttribute("aria-hidden", "true");

  const text = document.createElement("div");
  text.className = "rotate-gate__msg";
  text.setAttribute("data-rotate-msg", "");
  text.textContent = message;

  overlay.appendChild(icon);
  overlay.appendChild(text);
  document.body.appendChild(overlay);
  return overlay;
};

export const showRotateOverlay = (message: string): void => {
  ensureOverlay(message);
};

export const hideRotateOverlay = (): void => {
  document.getElementById(ROTATE_OVERLAY_ID)?.remove();
};

export type OrientationGate = {
  /** Tear down listeners and hide the overlay. */
  dispose: () => void;
};

type MqListener = (this: MediaQueryList, ev: MediaQueryListEvent) => void;

const bindPortraitMq = (sync: () => void): (() => void) => {
  const mq = window.matchMedia("(orientation: portrait)");
  const onMq: MqListener = () => sync();
  if (mq.addEventListener) mq.addEventListener("change", onMq);
  else mq.addListener(onMq);
  window.addEventListener("resize", sync);
  return () => {
    if (mq.removeEventListener) mq.removeEventListener("change", onMq);
    else mq.removeListener(onMq);
    window.removeEventListener("resize", sync);
  };
};

/**
 * Block until the device is landscape, then call onReady once.
 * If already landscape, onReady fires immediately (sync).
 */
export const waitForLandscape = (
  message: string,
  onReady: () => void,
): OrientationGate => {
  let done = false;
  let unbind: (() => void) | null = null;

  const finish = () => {
    if (done) return;
    done = true;
    unbind?.();
    unbind = null;
    hideRotateOverlay();
    onReady();
  };

  const sync = () => {
    if (done) return;
    if (isPortrait()) showRotateOverlay(message);
    else finish();
  };

  if (!isPortrait()) {
    finish();
    return { dispose: () => {} };
  }

  showRotateOverlay(message);
  unbind = bindPortraitMq(sync);

  return {
    dispose: () => {
      if (done) return;
      done = true;
      unbind?.();
      unbind = null;
      hideRotateOverlay();
    },
  };
};

/**
 * During gameplay: pause while portrait, resume on landscape.
 * Does not start the game — only freezes / unfreezes via callbacks.
 */
export const startPlayOrientationGate = (opts: {
  message: string;
  onPause: () => void;
  onResume: () => void;
}): OrientationGate => {
  let disposed = false;
  let paused = false;

  const sync = () => {
    if (disposed) return;
    if (isPortrait()) {
      showRotateOverlay(opts.message);
      if (!paused) {
        paused = true;
        opts.onPause();
      }
    } else {
      hideRotateOverlay();
      if (paused) {
        paused = false;
        opts.onResume();
      }
    }
  };

  sync();
  const unbind = bindPortraitMq(sync);

  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      unbind();
      hideRotateOverlay();
      // If we left while paused, resume so the next session isn't stuck.
      if (paused) {
        paused = false;
        opts.onResume();
      }
    },
  };
};
