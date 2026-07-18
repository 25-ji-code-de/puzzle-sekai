/**
 * Lightweight focus trap for modal dialogs.
 *
 * - traps Tab / Shift+Tab inside `root`
 * - focuses an initial control (or first tabbable)
 * - restores focus to the previously focused element on release
 * - optional Escape → onEscape
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export type FocusTrapHandle = {
  /** Detach listeners and restore focus (unless restore=false). */
  release: (opts?: { restore?: boolean }) => void;
};

const tabbables = (root: HTMLElement): HTMLElement[] => {
  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  return nodes.filter((el) => {
    if (el.getAttribute("aria-hidden") === "true") return false;
    if (el.tabIndex < 0) return false;
    // offsetParent is null for display:none / detached; fixed elements still ok.
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return true;
  });
};

export type FocusTrapOptions = {
  /** Element to focus first. Defaults to first tabbable (or root). */
  initialFocus?: HTMLElement | null;
  /** Escape key handler (e.g. close dialog). */
  onEscape?: () => void;
  /**
   * When true, root itself is focusable as a last resort (tabindex=-1) so
   * screen readers land on the dialog even with no buttons yet.
   */
  fallbackRootFocus?: boolean;
};

/**
 * Activate a focus trap on `root`. Call `release()` when the dialog closes.
 * Safe if called twice on the same root — previous trap is released first.
 */
export const trapFocus = (
  root: HTMLElement,
  opts: FocusTrapOptions = {},
): FocusTrapHandle => {
  const previouslyFocused =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  if (opts.fallbackRootFocus !== false && !root.hasAttribute("tabindex")) {
    root.setAttribute("tabindex", "-1");
  }

  const focusInitial = () => {
    const target =
      opts.initialFocus && root.contains(opts.initialFocus)
        ? opts.initialFocus
        : tabbables(root)[0] ?? root;
    try {
      target.focus({ preventScroll: true });
    } catch {
      try {
        target.focus();
      } catch {
        /* ignore */
      }
    }
  };

  // Defer one frame so layout / append has settled.
  const raf =
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : (cb: FrameRequestCallback) => window.setTimeout(cb, 0);
  const rafId = raf(() => focusInitial());

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && opts.onEscape) {
      e.preventDefault();
      e.stopPropagation();
      opts.onEscape();
      return;
    }
    if (e.key !== "Tab") return;

    const list = tabbables(root);
    if (list.length === 0) {
      e.preventDefault();
      try {
        root.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
      return;
    }

    const first = list[0];
    const last = list[list.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey) {
      if (!active || active === first || !root.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (!active || active === last || !root.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  };

  // Capture so game hotkeys (Esc / P) don't steal while a menu dialog is open.
  root.addEventListener("keydown", onKeyDown, true);

  let released = false;
  const release = (releaseOpts?: { restore?: boolean }) => {
    if (released) return;
    released = true;
    if (typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(rafId as number);
    }
    root.removeEventListener("keydown", onKeyDown, true);
    if (releaseOpts?.restore === false) return;
    if (previouslyFocused && previouslyFocused.isConnected) {
      try {
        previouslyFocused.focus({ preventScroll: true });
      } catch {
        try {
          previouslyFocused.focus();
        } catch {
          /* ignore */
        }
      }
    }
  };

  return { release };
};
