/**
 * Pure orientation helpers (injectable matchMedia for tests).
 */
export type MatchMediaFn = (query: string) => { matches: boolean };

/** True when orientation media query reports portrait. */
export const isPortraitWith = (
  matchMedia: MatchMediaFn | undefined,
): boolean => {
  if (!matchMedia) return false;
  try {
    return matchMedia("(orientation: portrait)").matches;
  } catch {
    return false;
  }
};

/**
 * Fullscreen detection across standard + webkit/ms prefixes.
 * Pass a document-like object for unit tests.
 */
export type FullscreenDoc = {
  fullscreenElement?: Element | null;
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
};

export const isFullscreenOn = (
  doc: FullscreenDoc | null | undefined,
): boolean =>
  !!(
    doc &&
    (doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.msFullscreenElement)
  );

/**
 * Phone / tablet / narrow viewport — stick "compact" profile
 * (larger ring, calmer lateral). Independent of display-mode default:
 * iPadOS stays compact even when defaulting to windowed.
 */
export const isCompactPointerViewport = (
  matchMedia: MatchMediaFn | undefined,
): boolean => {
  if (!matchMedia) return false;
  try {
    if (matchMedia("(hover: none) and (pointer: coarse)").matches) return true;
    if (matchMedia("(max-width: 900px)").matches) return true;
  } catch {
    /* ignore */
  }
  return false;
};

/**
 * Injectable navigator-ish bits for iPadOS detection (tests pass fakes).
 * iPadOS 13+ often spoofs a desktop Mac UA; multi-touch is the giveaway.
 */
export type PlatformHints = {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
};

/**
 * True on iPad / iPadOS (including desktop-site UA on iPadOS 13+).
 * Not true for iPhone or Android tablets — those keep phone/tablet defaults.
 */
export const isIPadOS = (hints: PlatformHints | undefined): boolean => {
  if (!hints) return false;
  const ua = hints.userAgent ?? "";
  if (/iPad/i.test(ua)) return true;
  // iPadOS "Request Desktop Website": Macintosh UA + multi-touch trackpad/screen.
  const macLike = /Macintosh/i.test(ua) || hints.platform === "MacIntel";
  if (macLike && (hints.maxTouchPoints ?? 0) > 1) return true;
  return false;
};

/**
 * First-run / missing `displayMode` default:
 * - iPadOS → windowed (system swipe-down exits browser fullscreen)
 * - phone / other tablets / narrow viewport → fullscreen
 * - desktop / large → windowed
 *
 * Pure: inject matchMedia + optional platform hints for tests.
 * Callers with DOM use {@link resolveDefaultDisplayMode}.
 */
export type DefaultDisplayMode = "windowed" | "fullscreen";

export const preferredDefaultDisplayMode = (
  matchMedia: MatchMediaFn | undefined,
  platform?: PlatformHints,
): DefaultDisplayMode => {
  // iPadOS only — Android tablets still prefer fullscreen.
  if (isIPadOS(platform)) return "windowed";
  if (!matchMedia) return "windowed";
  try {
    if (matchMedia("(hover: none) and (pointer: coarse)").matches) {
      return "fullscreen";
    }
    if (matchMedia("(max-width: 900px)").matches) {
      return "fullscreen";
    }
  } catch {
    /* ignore */
  }
  return "windowed";
};

/** Live viewport default for settings load (SSR / tests → windowed). */
export const resolveDefaultDisplayMode = (): DefaultDisplayMode => {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return "windowed";
  }
  const nav =
    typeof navigator !== "undefined"
      ? {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          maxTouchPoints: navigator.maxTouchPoints,
        }
      : undefined;
  return preferredDefaultDisplayMode(window.matchMedia.bind(window), nav);
};
