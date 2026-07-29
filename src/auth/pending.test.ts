import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthPending, onAuthPendingChange, setAuthPending } from "./pending";

const makeStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

afterEach(() => vi.unstubAllGlobals());

describe("auth pending state", () => {
  it("persists state and notifies subscribers", () => {
    vi.stubGlobal("sessionStorage", makeStorage());
    const listener = vi.fn();
    const unsubscribe = onAuthPendingChange(listener);

    setAuthPending(true);
    expect(getAuthPending()).toBe(true);
    setAuthPending(false);
    expect(getAuthPending()).toBe(false);
    expect(listener.mock.calls).toEqual([[true], [false]]);

    unsubscribe();
  });

  it("still updates the UI when session storage is unavailable", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    const listener = vi.fn();
    const unsubscribe = onAuthPendingChange(listener);

    setAuthPending(true);
    expect(getAuthPending()).toBe(false);
    expect(listener).toHaveBeenCalledWith(true);

    unsubscribe();
  });
});
