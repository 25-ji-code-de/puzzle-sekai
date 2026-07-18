/**
 * Active-piece lifecycle registry: dispose on land / match teardown.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  disposeAllActivePieces,
  isDisplayAlive,
  registerActivePiece,
} from "./lifecycle";

describe("active piece lifecycle", () => {
  beforeEach(() => {
    disposeAllActivePieces();
  });

  it("runs registered disposers once via disposeAll", () => {
    let n = 0;
    registerActivePiece(() => {
      n += 1;
    });
    registerActivePiece(() => {
      n += 10;
    });
    disposeAllActivePieces();
    expect(n).toBe(11);
    disposeAllActivePieces();
    expect(n).toBe(11);
  });

  it("release() is one-shot and removes from the registry", () => {
    let n = 0;
    const release = registerActivePiece(() => {
      n += 1;
    });
    release();
    release();
    disposeAllActivePieces();
    expect(n).toBe(1);
  });

  it("isDisplayAlive rejects null-transform objects", () => {
    expect(isDisplayAlive({ transform: {} })).toBe(true);
    expect(isDisplayAlive({ transform: null })).toBe(false);
  });
});
