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
