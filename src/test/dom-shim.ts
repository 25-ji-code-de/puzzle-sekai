/**
 * Minimal document / navigator stub for pure unit tests that transitively
 * import i18n (which mutates <html lang>, title, and meta tags on load).
 * Import this module before any settings/difficulty import.
 */

type MetaEl = {
  name: string;
  content: string;
};

type MetaList = {
  forEach: (fn: (el: MetaEl) => void) => void;
};

const metas = new Map<string, MetaEl>();

const g = globalThis as any;

if (typeof g.navigator === "undefined") {
  g.navigator = { language: "en-US" };
}

if (typeof g.document === "undefined") {
  g.document = {
    documentElement: { lang: "en" },
    title: "",
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
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
    querySelectorAll: (): MetaList => ({
      forEach: () => {},
    }),
    createElement: (): MetaEl => ({ name: "", content: "" }),
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}
