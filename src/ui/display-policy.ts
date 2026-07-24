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
 * Phone / tablet / narrow viewport — same bucket as default fullscreen
 * and stick "compact" profile (larger ring, calmer lateral).
 */
export const isCompactPointerViewport = (
  matchMedia: MatchMediaFn | undefined,
): boolean => preferredDefaultDisplayMode(matchMedia) === "fullscreen";

/**
 * First-run / missing `displayMode` default:
 * - phone / tablet (coarse pointer, no hover) or narrow viewport → fullscreen
 * - desktop / large → windowed
 *
 * Pure: inject matchMedia for tests. Callers with DOM use
 * {@link resolveDefaultDisplayMode}.
 */
export type DefaultDisplayMode = "windowed" | "fullscreen";

export const preferredDefaultDisplayMode = (
  matchMedia: MatchMediaFn | undefined,
): DefaultDisplayMode => {
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
  return preferredDefaultDisplayMode(window.matchMedia.bind(window));
};
