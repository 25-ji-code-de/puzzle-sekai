import { getLocale, onLocaleChange, type Locale } from "../i18n";
import maokenFontUrl from "../assets/fonts/MaokenAssortedSans-Lite.woff2";
import nishikiFontUrl from "../assets/fonts/nishiki-teki.woff2";
import robotoRegularUrl from "../assets/fonts/Roboto-Regular.woff2";
import robotoSemiBoldUrl from "../assets/fonts/Roboto-SemiBold.woff2";
import { devWarn } from "../util/dev-log";

/**
 * Centralized font schemes. Every text surface picks a scheme; stacks adapt
 * to locale so Chinese hanzi never render in NishikiTeki's Japanese forms.
 *
 * Policy: all UI copy uses the locale's cartoon/display face (Maoken for zh,
 * NishikiTeki for ja/en). Scores / timers use Roboto with tabular figures
 * (digit widths match; letters stay proportional) so pad-aligned scores work
 * without a mono face — Regular 400 + SemiBold 600 for strong digits.
 *
 * Families
 *  - brand   : fixed パズル⭐︎セカ → NishikiTeki
 *  - display : large/short UI (and, under all-cartoon policy, body/caption too)
 *  - body    : same stack as display (settings, captions, descriptions, credits)
 *  - mono    : Roboto (400 + 600) for numeric surfaces only
 *
 * Fallback faces (`* Fallback`, `* Fallback Latin`) are local()-only @font-face
 * rules with metric overrides (and size-adjust where needed) so font-display
 * swap does not shift layout. Values computed from font tables via fontkit —
 * see Chrome's "Improved font fallbacks" guidance.
 *
 * Schemes map to families + weight; call sites use scheme names only.
 */
export type FontFamilyRole = "brand" | "display" | "body" | "mono";
export type FontScheme =
  | "brand"
  | "heading"
  | "action"
  | "body"
  | "caption"
  | "numeric"
  | "numericStrong";

export interface ResolvedFontScheme {
  fontFamily: string;
  fontWeight: "400" | "500" | "600" | "700";
}

// Adjusted local fallback family names (defined in FALLBACK_FACE_CSS).
const MAOKEN_FB = "MaokenAssortedSans Fallback";
const MAOKEN_FB_LATIN = "MaokenAssortedSans Fallback Latin";
const NISHIKI_FB = "NishikiTeki Fallback";
const NISHIKI_FB_LATIN = "NishikiTeki Fallback Latin";
const MONO_FB = "Roboto Fallback";

// Per-locale display stacks; body reuses the same string (all-cartoon policy).
// Order: web face → metric-matched CJK local → metric-matched Latin local → generic.
const DISPLAY_ZH = `'MaokenAssortedSans','${MAOKEN_FB}','${MAOKEN_FB_LATIN}',sans-serif`;
const DISPLAY_JA = `'NishikiTeki','${NISHIKI_FB}','${NISHIKI_FB_LATIN}',sans-serif`;
const DISPLAY_EN = `'NishikiTeki','${NISHIKI_FB}','${NISHIKI_FB_LATIN}',sans-serif`;
const BRAND_STACK = `'NishikiTeki','${NISHIKI_FB}','${NISHIKI_FB_LATIN}',sans-serif`;
const MONO_STACK = `'Roboto','${MONO_FB}',sans-serif`;

const FAMILY_STACKS: Record<Locale, Record<FontFamilyRole, string>> = {
  zh: {
    brand: BRAND_STACK,
    display: DISPLAY_ZH,
    body: DISPLAY_ZH,
    mono: MONO_STACK,
  },
  ja: {
    brand: BRAND_STACK,
    display: DISPLAY_JA,
    body: DISPLAY_JA,
    mono: MONO_STACK,
  },
  en: {
    brand: BRAND_STACK,
    display: DISPLAY_EN,
    body: DISPLAY_EN,
    mono: MONO_STACK,
  },
};

const SCHEMES: Record<
  FontScheme,
  { family: FontFamilyRole; fontWeight: "400" | "500" | "600" | "700" }
> = {
  brand: { family: "brand", fontWeight: "400" },
  heading: { family: "display", fontWeight: "400" },
  action: { family: "display", fontWeight: "400" },
  body: { family: "body", fontWeight: "400" },
  caption: { family: "body", fontWeight: "400" },
  numeric: { family: "mono", fontWeight: "400" },
  numericStrong: { family: "mono", fontWeight: "600" },
};

const CSS_VARIABLES: Record<FontFamilyRole, string> = {
  brand: "--font-brand",
  display: "--font-display",
  body: "--font-body",
  mono: "--font-mono",
};

/**
 * Local-only faces that approximate each web font's vertical (and, where
 * needed, horizontal) metrics so swap does not cause layout shift.
 *
 * CJK system faces (YaHei / Yu Gothic / PingFang) already share full-width
 * advance with our display faces → size-adjust 100%, metrics-only.
 * Latin Arial is narrower → size-adjust + rescaled overrides.
 * System Roboto / Arial stand in for our Roboto numeric face.
 */
const FALLBACK_FACE_CSS = `
@font-face {
  font-family: "${MAOKEN_FB}";
  src: local("Microsoft YaHei"), local("PingFang SC"), local("Noto Sans CJK SC"),
       local("Noto Sans SC");
  ascent-override: 85.938%;
  descent-override: 14.063%;
  line-gap-override: 0%;
}
@font-face {
  font-family: "${MAOKEN_FB_LATIN}";
  src: local("Arial"), local("Helvetica Neue"), local("Helvetica");
  size-adjust: 107.832%;
  ascent-override: 79.696%;
  descent-override: 13.041%;
  line-gap-override: 0%;
}
@font-face {
  font-family: "${NISHIKI_FB}";
  src: local("Yu Gothic"), local("Hiragino Sans"),
       local("Hiragino Kaku Gothic ProN"), local("Microsoft YaHei"),
       local("PingFang SC");
  ascent-override: 87.891%;
  descent-override: 17.09%;
  line-gap-override: 0%;
}
@font-face {
  font-family: "${NISHIKI_FB_LATIN}";
  src: local("Arial"), local("Helvetica Neue"), local("Helvetica");
  size-adjust: 107.832%;
  ascent-override: 81.507%;
  descent-override: 15.849%;
  line-gap-override: 0%;
}
@font-face {
  font-family: "${MONO_FB}";
  src: local("Roboto"), local("Arial"), local("Helvetica Neue"), local("Helvetica");
  ascent-override: 92.773%;
  descent-override: 24.414%;
  line-gap-override: 0%;
}
`.trim();

export const resolveFontScheme = (
  scheme: FontScheme,
  locale: Locale = getLocale(),
): ResolvedFontScheme => {
  const definition = SCHEMES[scheme];
  return {
    fontFamily: FAMILY_STACKS[locale][definition.family],
    fontWeight: definition.fontWeight,
  };
};

/** Inline CSS fragment for DOM surfaces that need a non-body typography scheme. */
export const domFontStyle = (scheme: FontScheme): string => {
  const definition = SCHEMES[scheme];
  return `font-family:var(${CSS_VARIABLES[definition.family]});font-weight:${
    definition.fontWeight
  };`;
};

const applyFontVariables = (locale: Locale = getLocale()) => {
  const root = document.documentElement;
  (Object.keys(CSS_VARIABLES) as FontFamilyRole[]).forEach((role) => {
    root.style.setProperty(CSS_VARIABLES[role], FAMILY_STACKS[locale][role]);
  });
};

/** Inject metric-matched local fallback @font-face rules once. */
const injectFallbackFaces = () => {
  if (document.getElementById("font-fallback-faces")) return;
  const style = document.createElement("style");
  style.id = "font-fallback-faces";
  style.textContent = FALLBACK_FACE_CSS;
  document.head.appendChild(style);
};

const loadFace = async (
  family: string,
  url: string,
  weight: "400" | "500" | "600" | "700" = "400",
): Promise<void> => {
  // Register the face immediately with font-display: swap so the stack can
  // paint metric-matched local fallbacks while the woff2 downloads, then
  // swap in the web font without a layout shift.
  const face = new FontFace(family, `url(${url})`, {
    style: "normal",
    weight,
    display: "swap",
  });
  document.fonts.add(face);
  await face.load();
};

/** Display face needed for a locale (brand always uses Nishiki). */
const displayFaceFor = (locale: Locale): { family: string; url: string } =>
  locale === "zh"
    ? { family: "MaokenAssortedSans", url: maokenFontUrl }
    : { family: "NishikiTeki", url: nishikiFontUrl };

/** Keys are `${family}:${weight}` so multi-weight families can load both. */
const loadedFaces = new Set<string>();

const ensureFace = async (
  family: string,
  url: string,
  weight: "400" | "500" | "600" | "700" = "400",
): Promise<void> => {
  const key = `${family}:${weight}`;
  if (loadedFaces.has(key)) return;
  try {
    await loadFace(family, url, weight);
    loadedFaces.add(key);
  } catch (e) {
    devWarn(`Failed to load ${family} (${weight}) font:`, e);
  }
};

/** Load numeric Roboto (400+600) + brand (Nishiki) + the locale display face. */
const loadFontsForLocale = async (locale: Locale): Promise<void> => {
  const display = displayFaceFor(locale);
  await Promise.allSettled([
    ensureFace("Roboto", robotoRegularUrl, "400"),
    ensureFace("Roboto", robotoSemiBoldUrl, "600"),
    ensureFace("NishikiTeki", nishikiFontUrl), // brand always
    ensureFace(display.family, display.url),
  ]);
};

let fontsReady: Promise<void> = Promise.resolve();

let initialized = false;

/** Apply locale-aware CSS variables and load only fonts this locale needs. */
export const initializeFontSystem = (): Promise<void> => {
  if (!initialized) {
    initialized = true;
    injectFallbackFaces();
    applyFontVariables();
    fontsReady = loadFontsForLocale(getLocale());
    onLocaleChange((locale) => {
      applyFontVariables(locale);
      // Lazy-load the other display face if the user switches language.
      void loadFontsForLocale(locale);
    });
  }
  return fontsReady;
};

export { fontsReady };
