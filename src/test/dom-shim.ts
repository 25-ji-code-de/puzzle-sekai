/**
 * Minimal document / navigator stub for pure unit tests that transitively
 * import i18n (which mutates <html lang>, title, and meta tags on load).
 * Import this module before any settings/difficulty import.
 */

type MetaEl = {
  name: string;
  content: string;
};

type TestGlobals = {
  document?: Document;
  navigator?: Navigator;
};

const metas = new Map<string, MetaEl>();

const g = globalThis as unknown as TestGlobals;

if (typeof g.navigator === "undefined") {
  g.navigator = { language: "en-US" } as unknown as Navigator;
}

if (typeof g.document === "undefined") {
  g.document = {
    documentElement: { lang: "en" } as unknown as HTMLElement,
    title: "",
    body: {
      appendChild: <T extends Node>(node: T): T => node,
      removeChild: <T extends Node>(node: T): T => node,
    },
    head: {
      appendChild: <T extends Node>(node: T): T => {
        const meta = node as unknown as MetaEl;
        if (meta.name) metas.set(meta.name, meta);
        return node;
      },
    },
    visibilityState: "visible",
    querySelector: (sel: string) => {
      const m = /^meta\[name="([^"]+)"\]$/.exec(sel);
      if (!m) return null;
      return (metas.get(m[1]!) ?? null) as unknown as Element | null;
    },
    querySelectorAll: () => [] as unknown as NodeListOf<Element>,
    createElement: () => ({ name: "", content: "" }) as unknown as HTMLElement,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as Document;
}
