import { describe, expect, it } from "vitest";
import { toHttpResult } from "./http";

describe("toHttpResult", () => {
  it("marks 2xx as ok", () => {
    expect(toHttpResult(200, "{}").ok).toBe(true);
    expect(toHttpResult(201, "").ok).toBe(true);
    expect(toHttpResult(299, "x").ok).toBe(true);
  });

  it("marks non-2xx as not ok", () => {
    expect(toHttpResult(199, "").ok).toBe(false);
    expect(toHttpResult(300, "").ok).toBe(false);
    expect(toHttpResult(404, "nope").ok).toBe(false);
    expect(toHttpResult(0, "").ok).toBe(false);
  });

  it("json() parses body or null; garbage is null", () => {
    expect(toHttpResult(200, '{"a":1}').json()).toEqual({ a: 1 });
    expect(toHttpResult(200, "").json()).toBeNull();
    expect(toHttpResult(200, "{nope").json()).toBeNull();
  });

  it("preserves status and text", () => {
    const r = toHttpResult(502, "bad gateway");
    expect(r.status).toBe(502);
    expect(r.text).toBe("bad gateway");
  });
});
