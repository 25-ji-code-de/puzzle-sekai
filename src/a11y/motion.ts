/**
 * prefers-reduced-motion helper.
 *
 * Gameplay timing (drop speed, hard-drop) is untouched — only presentation
 * VFX / decorative waits / CSS chrome should call this.
 */

let cached: boolean | null = null;
let mq: MediaQueryList | null = null;
const listeners = new Set<() => void>();

/** Pure: interpret a MediaQueryList.matches value (null/undefined → false). */
export const reducedMotionFromMatches = (
  matches: boolean | null | undefined,
): boolean => matches === true;

const read = (): boolean => {
  try {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return reducedMotionFromMatches(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  } catch {
    return false;
  }
};

const ensureMq = (): MediaQueryList | null => {
  if (mq || typeof window === "undefined" || !window.matchMedia) return mq;
  try {
    mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      cached = mq?.matches ?? false;
      listeners.forEach((fn) => {
        try {
          fn();
        } catch {
          /* ignore */
        }
      });
    };
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
    } else {
      // Safari < 14
      (
        mq as MediaQueryList & {
          addListener?: (cb: () => void) => void;
        }
      ).addListener?.(onChange);
    }
  } catch {
    mq = null;
  }
  return mq;
};

/** True when the OS/browser asks for reduced motion. */
export const prefersReducedMotion = (): boolean => {
  if (cached === null) {
    ensureMq();
    cached = read();
  }
  return cached;
};

/** Subscribe to OS preference flips (e.g. re-paint CSS chrome). Returns unsubscribe. */
export const onReducedMotionChange = (fn: () => void): (() => void) => {
  ensureMq();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
