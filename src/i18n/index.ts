import { zh } from "./locales/zh";
import { ja } from "./locales/ja";
import { en } from "./locales/en";

export type Locale = "zh" | "ja" | "en";

const LOCALES: Record<Locale, Record<string, any>> = { zh, ja, en };

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
  const saved = localStorage.getItem("puzzleSekaiLocale") as Locale | null;
  if (saved && LOCALES[saved]) return saved;
  return detectLocale();
}

/** Switch locale, save to localStorage, notify listeners */
export function setLocale(locale: Locale): void {
  if (!LOCALES[locale]) return;
  currentLocale = locale;
  localStorage.setItem("puzzleSekaiLocale", locale);
  document.documentElement.lang = locale === "zh" ? "zh-CN" : locale;
  document.title = LOCALES[locale].page.title;
  applyDataI18n();
  for (const fn of listeners) fn(locale);
}

/** Translate all elements with `data-i18n="key"` attributes in the document */
function applyDataI18n(): void {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) {
      const translated = t(key);
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
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = LOCALES[currentLocale];
  const value = key.split(".").reduce((obj: any, k) => obj?.[k], dict);
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
applyDataI18n();
