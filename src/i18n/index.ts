import { getStoragePort } from "../settings/storage";
import { zh } from "./locales/zh";
import { ja } from "./locales/ja";
import { en } from "./locales/en";
import type { LocaleTree, MessageKey } from "./types";

export type { MessageKey, LocaleTree } from "./types";
export type Locale = "zh" | "ja" | "en";

/** All catalogs must match the English key tree (string leaves). */
const LOCALES: Record<Locale, LocaleTree> = { zh, ja, en };

let currentLocale: Locale = "zh";
const listeners: Array<(locale: Locale) => void> = [];

/** Detect locale from browser language, fallback to zh */
function detectLocale(): Locale {
  const lang = navigator.language?.toLowerCase() || "";
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("en")) return "en";
  return "zh";
}

/** Load saved locale from localStorage, or detect from browser */
export function getLocale(): Locale {
  const saved = getStoragePort().get("puzzleSekaiLocale") as Locale | null;
  if (saved && LOCALES[saved]) return saved;
  return detectLocale();
}

/** Keep <meta name="description"> and <meta name="keywords"> in sync. */
function applyMetaTags(locale: Locale = currentLocale): void {
  const page = LOCALES[locale].page;
  const setMeta = (name: "description" | "keywords", content: string) => {
    if (!content) return;
    let meta = document.querySelector(
      `meta[name="${name}"]`,
    ) as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  };
  setMeta("description", page.description);
  setMeta("keywords", page.keywords);
}

/** Switch locale, save to localStorage, notify listeners */
export function setLocale(locale: Locale): void {
  if (!LOCALES[locale]) return;
  currentLocale = locale;
  getStoragePort().set("puzzleSekaiLocale", locale);
  document.documentElement.lang = locale === "zh" ? "zh-CN" : locale;
  document.title = LOCALES[locale].page.title;
  applyMetaTags(locale);
  applyDataI18n();
  for (const fn of listeners) fn(locale);
}

/** Translate all elements with `data-i18n="key"` attributes in the document */
function applyDataI18n(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) {
      const translated = t(key as MessageKey);
      if (translated !== key) el.innerHTML = translated;
    }
  });
}

/** Register a callback for locale changes */
export function onLocaleChange(fn: (locale: Locale) => void): void {
  listeners.push(fn);
}

/**
 * Translate a dot-separated key with optional interpolation.
 * `t("settings.speed.slow")` → `"慢速"`
 * `t("settings.ta.duration", { seconds: 90 })` → `"90秒"`
 *
 * Dynamic keys built at runtime (e.g. fun mode ids) should be cast:
 * `t(\`fun.${id}.name\` as MessageKey)`.
 */
export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const dict: unknown = LOCALES[currentLocale];
  const value = key.split(".").reduce<unknown>((obj, k) => {
    if (obj && typeof obj === "object" && k in obj) {
      return (obj as Record<string, unknown>)[k];
    }
    return undefined;
  }, dict);
  let str = typeof value === "string" ? value : key;
  if (params) {
    for (const [pk, pv] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${pk}\\}`, "g"), String(pv));
    }
  }
  return str;
}

/** List of supported locales for the language switcher */
export const SUPPORTED_LOCALES: { value: Locale; label: string }[] = [
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
];

// Initialize on module load
currentLocale = getLocale();
document.documentElement.lang = currentLocale === "zh" ? "zh-CN" : currentLocale;
document.title = LOCALES[currentLocale].page.title;
applyMetaTags(currentLocale);
applyDataI18n();
