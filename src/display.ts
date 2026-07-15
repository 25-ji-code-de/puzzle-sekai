/**
 * Display helpers: orientation detection, rotate-to-landscape gate,
 * and best-effort fullscreen on game start (mobile browsers only).
 */

const ROTATE_OVERLAY_ID = "rotate-landscape-overlay";

export const isPortrait = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(orientation: portrait)").matches;

/** True when the document is currently in a fullscreen element. */
export const isFullscreen = (): boolean =>
  !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).msFullscreenElement
  );

/**
 * Request fullscreen on the document element. Must be called from a
 * user-gesture handler (click / tap). Best-effort: rejects quietly when
 * the browser blocks it (iOS Safari, desktop policy, etc.).
 */
export const requestAppFullscreen = async (): Promise<boolean> => {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    msRequestFullscreen?: () => Promise<void> | void;
  };
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return true;
    }
    if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen();
      return true;
    }
    if (el.msRequestFullscreen) {
      await el.msRequestFullscreen();
      return true;
    }
  } catch (e) {
    console.warn("Fullscreen request failed:", e);
  }
  return false;
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
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:20000;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:20px;padding:32px 24px;text-align:center;
    background:rgba(8,10,18,0.94);backdrop-filter:blur(6px);
    color:#fff;pointer-events:auto;
  `;

  const icon = document.createElement("div");
  icon.setAttribute("aria-hidden", "true");
  icon.style.cssText = `
    width:56px;height:96px;border:3px solid rgba(180,220,255,0.85);
    border-radius:10px;position:relative;
    animation:rotateHint 1.6s ease-in-out infinite;
    box-shadow:0 0 24px rgba(100,200,255,0.2);
  `;
  const notch = document.createElement("div");
  notch.style.cssText = `
    position:absolute;top:6px;left:50%;transform:translateX(-50%);
    width:18px;height:4px;border-radius:2px;background:rgba(180,220,255,0.7);
  `;
  icon.appendChild(notch);

  const text = document.createElement("div");
  text.setAttribute("data-rotate-msg", "");
  text.style.cssText = `
    font-size:18px;line-height:1.6;letter-spacing:0.04em;
    color:rgba(220,235,255,0.92);max-width:280px;
  `;
  text.textContent = message;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes rotateHint {
      0%, 100% { transform: rotate(0deg); }
      35% { transform: rotate(90deg); }
      65% { transform: rotate(90deg); }
    }
  `;

  overlay.appendChild(style);
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
