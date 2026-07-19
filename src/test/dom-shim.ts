/**
 * Minimal document / navigator stub for pure unit tests that transitively
 * import i18n (which mutates <html lang>, title, and meta tags on load).
 * Import this module before any settings/difficulty import.
 */

type MetaEl = {
  name: string;
  content: string;
};

const metas = new Map<string, MetaEl>();

const g = globalThis as typeof globalThis & {
  document?: {
    documentElement: { lang: string };
    title: string;
    head: { appendChild: (el: MetaEl) => void };
    visibilityState?: string;
    querySelector: (sel: string) => MetaEl | null;
    querySelectorAll: (sel: string) => { forEach: (fn: (el: never) => void) => void };
    createElement: (tag: string) => MetaEl;
    addEventListener?: (...args: unknown[]) => void;
    removeEventListener?: (...args: unknown[]) => void;
  };
  navigator?: { language?: string };
};

if (typeof g.navigator === "undefined") {
  g.navigator = { language: "en-US" };
}

if (typeof g.document === "undefined") {
  g.document = {
    documentElement: { lang: "en" },
    title: "",
    head: {
      appendChild: (el: MetaEl) => {
        if (el.name) metas.set(el.name, el);
      },
    },
    visibilityState: "visible",
    querySelector: (sel: string) => {
      const m = /^meta\[name="([^"]+)"\]$/.exec(sel);
      if (!m) return null;
      return metas.get(m[1]!) ?? null;
    },
    querySelectorAll: () => ({
      forEach: () => {},
    }),
    createElement: () => ({ name: "", content: "" }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}
