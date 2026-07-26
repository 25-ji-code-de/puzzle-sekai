/**
 * Touch half-screen helper (canvas letterbox-aware).
 */
import "../test/dom-shim";
import { beforeAll, describe, it, expect, vi } from "vitest";

/*
 * 预热 ./controls 的模块图。
 *
 * 每个用例都 `await import("./controls")`，但只有**第一个**真正付出
 * 加载成本 —— 那张图很大，冷加载在并行跑整套时能逼近 1.8s，默认 5s
 * 的用例超时下会偶发超时，而红的会是恰好排在第一个的那个用例，
 * 看起来像它自己的问题。
 *
 * 放进 beforeAll 之后这笔开销归到 hook 上，且只付一次。
 */
beforeAll(async () => {
  await import("./controls");
}, 30_000);

vi.mock("../runtime", () => ({
  app: {
    view: {
      getBoundingClientRect: () => ({
        left: 0,
        width: 100,
        top: 0,
        height: 100,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setPointerCapture: vi.fn(),
    },
  },
  gameTicker: {
    add: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("../fun/effects", () => ({
  isControlsSwapped: () => false,
}));

vi.mock("../replay", () => ({
  isReplayPlayback: () => false,
  recordReplayAction: vi.fn(),
}));

vi.mock("../board/dynamics", () => ({
  isContinuousPhysics: () => false,
}));

describe("isLeftHalfOfCanvas", () => {
  it("uses canvas mid-x, not window mid-x", async () => {
    const { isLeftHalfOfCanvas } = await import("./controls");
    // Canvas letterboxed: starts at x=200, width 800 → mid = 600
    const view = {
      getBoundingClientRect: () => ({
        left: 200,
        width: 800,
        top: 0,
        height: 100,
        right: 1000,
        bottom: 100,
        x: 200,
        y: 0,
        toJSON: () => ({}),
      }),
    } as HTMLElement;
    expect(isLeftHalfOfCanvas(500, view)).toBe(true); // left of 600
    expect(isLeftHalfOfCanvas(700, view)).toBe(false); // right of 600
  });

  it("treats exact mid as right half (strict <)", async () => {
    const { isLeftHalfOfCanvas } = await import("./controls");
    const view = {
      getBoundingClientRect: () => ({
        left: 0,
        width: 100,
        top: 0,
        height: 100,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    } as HTMLElement;
    expect(isLeftHalfOfCanvas(50, view)).toBe(false);
    expect(isLeftHalfOfCanvas(49.9, view)).toBe(true);
  });
});

describe("isTypingTargetLike", () => {
  it("rejects non-elements", async () => {
    const { isTypingTargetLike } = await import("./controls");
    expect(isTypingTargetLike({ isElement: false })).toBe(false);
  });

  it("accepts input/textarea/select and contentEditable", async () => {
    const { isTypingTargetLike } = await import("./controls");
    expect(isTypingTargetLike({ isElement: true, tagName: "INPUT" })).toBe(
      true,
    );
    expect(isTypingTargetLike({ isElement: true, tagName: "textarea" })).toBe(
      true,
    );
    expect(isTypingTargetLike({ isElement: true, tagName: "SELECT" })).toBe(
      true,
    );
    expect(isTypingTargetLike({ isElement: true, contentEditable: true })).toBe(
      true,
    );
    expect(isTypingTargetLike({ isElement: true, tagName: "DIV" })).toBe(false);
  });
});
