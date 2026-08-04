import "../test/dom-shim";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordReplayAction } from "../replay";
import {
  finishTouchGesture,
  tryCapturePointer,
  type TouchPieceActions,
} from "./touch-shared";

vi.mock("../runtime", () => ({
  app: {
    view: {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 100,
        height: 100,
      }),
    },
  },
}));

vi.mock("../fun/effects", () => ({
  isControlsSwapped: () => false,
}));

vi.mock("../replay", () => ({
  recordReplayAction: vi.fn(),
}));

const makeActions = (): TouchPieceActions => ({
  moveLeft: vi.fn(),
  moveRight: vi.fn(),
  rotateCW: vi.fn(),
  rotateCCW: vi.fn(),
  hardDrop: vi.fn(),
  softDrop: vi.fn(),
  normalSpeed: vi.fn(),
  tryLift: vi.fn(),
});

const makeSession = (overrides: Record<string, unknown> = {}) => ({
  originX: 25,
  originY: 25,
  startedAt: 0,
  recentVelY: 0,
  consumedAsPan: false,
  ended: false,
  ...overrides,
});

const makeEvent = (clientX: number, clientY: number) =>
  ({ clientX, clientY }) as PointerEvent;

describe("shared touch gesture completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(performance, "now").mockReturnValue(100);
  });

  it("rotates on an allowed tap and clears the session", () => {
    const actions = makeActions();
    const session = makeSession();
    const clearSession = vi.fn();

    finishTouchGesture(makeEvent(25, 25), session, actions, clearSession, {
      cancelled: false,
      allowTap: true,
      deadZone: 20,
      flickMin: 40,
    });

    expect(actions.rotateCCW).toHaveBeenCalledOnce();
    expect(recordReplayAction).toHaveBeenCalledWith("CCW");
    expect(session.ended).toBe(true);
    expect(clearSession).toHaveBeenCalledOnce();
  });

  it("fires a hard drop for a downward flick", () => {
    const actions = makeActions();
    const session = makeSession({ consumedAsPan: true, recentVelY: 100 });

    finishTouchGesture(makeEvent(25, 1000), session, actions, vi.fn(), {
      cancelled: false,
      allowTap: true,
      deadZone: 20,
      flickMin: 1,
    });

    expect(actions.hardDrop).toHaveBeenCalledOnce();
    expect(recordReplayAction).toHaveBeenCalledWith("HD");
    expect(session.ended).toBe(true);
  });

  it("does not fire gestures after pointer cancellation", () => {
    const actions = makeActions();
    const clearSession = vi.fn();
    const session = makeSession({ consumedAsPan: true, recentVelY: 100 });

    finishTouchGesture(makeEvent(25, 1000), session, actions, clearSession, {
      cancelled: true,
      allowTap: true,
      deadZone: 20,
      flickMin: 1,
    });

    expect(actions.hardDrop).not.toHaveBeenCalled();
    expect(actions.tryLift).not.toHaveBeenCalled();
    expect(clearSession).toHaveBeenCalledOnce();
  });

  it("treats pointer capture as optional", () => {
    const surface = {
      setPointerCapture: vi.fn(() => {
        throw new Error("unsupported");
      }),
    } as unknown as HTMLElement;

    expect(() => tryCapturePointer(surface, 7)).not.toThrow();
  });
});
