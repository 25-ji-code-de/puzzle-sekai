import { getLocale, onLocaleChange, type Locale } from "./i18n";
import maokenFontUrl from "./assets/fonts/MaokenAssortedSans-Lite.woff2";
import nishikiFontUrl from "./assets/fonts/nishiki-teki.woff2";
import droidSansMonoFontUrl from "./assets/fonts/DroidSansMono.woff2";

/**
 * Centralized font schemes. Every text surface picks a scheme; stacks adapt
 * to locale so Chinese hanzi never render in NishikiTeki's Japanese forms.
 *
 * Policy: all UI copy uses the locale's cartoon/display face (Maoken for zh,
 * NishikiTeki for ja/en). Mono is reserved for pad-aligned digits only.
 *
 * Families
 *  - brand   : fixed パズル⭐︎セカ → NishikiTeki
 *  - display : large/short UI (and, under all-cartoon policy, body/caption too)
 *  - body    : same stack as display (settings, captions, descriptions, credits)
 *  - mono    : DroidSansMono for scores / timers / pure factors
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
  fontWeight: "400" | "700";
}

// Per-locale display stacks; body reuses the same string (all-cartoon policy).
const DISPLAY_ZH =
  "'MaokenAssortedSans','PingFang SC','Microsoft YaHei',sans-serif";
const DISPLAY_JA = "'NishikiTeki','Hiragino Sans','Yu Gothic',sans-serif";
const DISPLAY_EN = "'NishikiTeki','Helvetica Neue','Arial',sans-serif";
const BRAND_STACK = "'NishikiTeki','Hiragino Sans','Yu Gothic',sans-serif";
const MONO_STACK = "'DroidSansMono',monospace";

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
    brand: "'NishikiTeki','Helvetica Neue','Arial',sans-serif",
    display: DISPLAY_EN,
    body: DISPLAY_EN,
    mono: MONO_STACK,
  },
};

const SCHEMES: Record<
  FontScheme,
  { family: FontFamilyRole; fontWeight: "400" | "700" }
> = {
  brand: { family: "brand", fontWeight: "400" },
  heading: { family: "display", fontWeight: "400" },
  action: { family: "display", fontWeight: "400" },
  body: { family: "body", fontWeight: "400" },
  caption: { family: "body", fontWeight: "400" },
  numeric: { family: "mono", fontWeight: "400" },
  numericStrong: { family: "mono", fontWeight: "700" },
};

const CSS_VARIABLES: Record<FontFamilyRole, string> = {
  brand: "--font-brand",
  display: "--font-display",
  body: "--font-body",
  mono: "--font-mono",
};

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

const loadFace = async (family: string, url: string): Promise<void> => {
  const face = await new FontFace(family, `url(${url})`, {
    style: "normal",
    weight: "400",
  }).load();
  document.fonts.add(face);
};

const fontLoads = [
  ["MaokenAssortedSans", maokenFontUrl],
  ["NishikiTeki", nishikiFontUrl],
  ["DroidSansMono", droidSansMonoFontUrl],
] as const;

export const fontsReady: Promise<void> = Promise.allSettled(
  fontLoads.map(([family, url]) => loadFace(family, url)),
).then((results) => {
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.warn(
        `Failed to load ${fontLoads[index][0]} font:`,
        result.reason,
      );
    }
  });
});

let initialized = false;

/** Apply locale-aware CSS variables and register one locale listener. */
export const initializeFontSystem = (): Promise<void> => {
  if (!initialized) {
    initialized = true;
    applyFontVariables();
    onLocaleChange((locale) => applyFontVariables(locale));
  }
  return fontsReady;
};
