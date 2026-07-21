/**
 * i18n t() + locale switch (uses dom-shim; no real browser).
 */
import "../test/dom-shim";
import { beforeEach, describe, expect, it } from "vitest";
import { getLocale, setLocale, t } from "./index";
import { setStoragePort, type StoragePort } from "../settings/storage";

const mem = new Map<string, string>();
const port: StoragePort = {
  get: (k) => (mem.has(k) ? mem.get(k)! : null),
  set: (k, v) => {
    mem.set(k, v);
  },
  remove: (k) => {
    mem.delete(k);
  },
  keys: () => [...mem.keys()],
};

beforeEach(() => {
  mem.clear();
  setStoragePort(port);
  setLocale("en");
});

describe("t()", () => {
  it("resolves nested keys for English", () => {
    expect(t("about.version")).toBe("Version");
    expect(t("menu.endless")).toBeTruthy();
  });

  it("interpolates {params}", () => {
    // a11y.score: "Score {score}" style
    const s = t("a11y.score", { score: 1234 });
    expect(s).toContain("1234");
    expect(s).not.toContain("{score}");
  });

  it("switches with setLocale", () => {
    setLocale("zh");
    expect(getLocale()).toBe("zh");
    expect(t("about.version")).toBe("版本");
    setLocale("ja");
    expect(t("about.version")).toBe("バージョン");
  });
});
