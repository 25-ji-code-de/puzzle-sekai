/**
 * Shared keyboard + touch bindings for the active falling piece.
 * Handles control-swap (Shizuku fun mode) for both standard and 2×2 pieces.
 *
 * Pure input binding only: maps events → action callbacks. Continuous hold
 * repeat lives on gameTicker via hold-move.ts (passed in as optional bridge).
 * Touch direct-drag lives in touch-controls.ts (Pointer Events).
 */
import { app } from "../runtime";
import { isControlsSwapped } from "../fun/effects";
import { isReplayPlayback, recordReplayAction } from "../replay";
import { getUserSettings } from "../settings";
import type { HoldMove } from "./hold-move";
import { bindTouchControls } from "./touch-controls";
import { isContinuousPhysics } from "../board/dynamics";

export type PieceControlActions = {
  moveLeft: () => void;
  moveRight: () => void;
  rotateCW: () => void;
  rotateCCW: () => void;
  hardDrop: () => void;
  softDrop: () => void;
  normalSpeed: () => void;
  /**
   * Optional easter-egg lift (Shift+↑ / flick up).
   * Called only when the piece opts in (Emu / NeneRobo).
   */
  tryLift?: () => void;
  /**
   * Continuous (truePhysics) touch drag: shift by stage pixels.
   * Return true if the piece actually moved.
   */
  shiftBy?: (stageDx: number) => boolean;
};

/**
 * Whether a client point is on the left half of the game canvas.
 * Uses the canvas bounding box (not window.innerWidth) so letterboxing
 * does not flip left/right rotate zones.
 */
export const isLeftHalfOfCanvas = (
  clientX: number,
  view: HTMLElement = app.view as HTMLElement,
): boolean => {
  const rect = view.getBoundingClientRect();
  if (rect.width <= 0) return clientX < window.innerWidth / 2;
  return clientX < rect.left + rect.width / 2;
};

/**
 * Pure typing-target check (no DOM). Used so settings fields keep arrows/space.
 */
export const isTypingTargetLike = (opts: {
  isElement: boolean;
  contentEditable?: boolean;
  tagName?: string;
}): boolean => {
  if (!opts.isElement) return false;
  if (opts.contentEditable) return true;
  const tag = (opts.tagName || "").toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

/** True when focus is on a field that should keep native key behavior. */
export const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return isTypingTargetLike({
    isElement: true,
    contentEditable: target.isContentEditable,
    tagName: target.tagName,
  });
};

/** Fire a one-shot horizontal move (grid path / replay). */
const fireHorizontal = (
  actions: PieceControlActions,
  swapped: boolean,
  wantLeft: boolean,
): void => {
  const goLeft = wantLeft !== swapped;
  (goLeft ? actions.moveLeft : actions.moveRight)();
  recordReplayAction(goLeft ? "L" : "R");
};

/** Fire a rotation, honouring control-swap. */
const fireRotate = (
  actions: PieceControlActions,
  swapped: boolean,
  wantCw: boolean,
): void => {
  const cw = wantCw !== swapped;
  (cw ? actions.rotateCW : actions.rotateCCW)();
  recordReplayAction(cw ? "CW" : "CCW");
};

/**
 * Arm continuous hold-strafe on a real key edge (ignore browser key-repeat).
 * Returns whether the event was consumed.
 */
const armHoldEdge = (
  hold: HoldMove | undefined,
  side: "left" | "right",
  event: KeyboardEvent,
  swapped: boolean,
): boolean => {
  if (!hold) return false;
  if (event.repeat) return true; // consumed, but no re-arm
  if (side === "left") hold.setLeftHeld(true);
  else hold.setRightHeld(true);
  recordReplayAction(
    side === "left" ? (swapped ? "R" : "L") : swapped ? "L" : "R",
  );
  return true;
};

export type BindPieceControlsOpts = {
  /** Continuous mode keyboard hold-strafe bridge. */
  hold?: HoldMove;
  /**
   * Continuous touch stick full-tilt speed (px / PIXI delta).
   * Should match keyboard hold strafe when truePhysics is on.
   */
  strafeSpeed?: number;
};

/**
 * Bind controls; returns a dispose function that removes every listener.
 * Pass `hold` in continuous mode so left/right key edges only arm/disarm
 * hold-strafe (per-frame motion lives on gameTicker — no discrete first step,
 * no browser key-repeat).
 */
export const bindPieceControls = (
  actions: PieceControlActions,
  holdOrOpts?: HoldMove | BindPieceControlsOpts,
): (() => void) => {
  if (isReplayPlayback()) {
    return () => {};
  }

  const hold =
    holdOrOpts && "setLeftHeld" in holdOrOpts
      ? holdOrOpts
      : (holdOrOpts as BindPieceControlsOpts | undefined)?.hold;
  const strafeSpeed =
    holdOrOpts && !("setLeftHeld" in holdOrOpts)
      ? (holdOrOpts as BindPieceControlsOpts).strafeSpeed
      : undefined;

  const handleKeyPress = (event: KeyboardEvent) => {
    // Settings / dialogs: don't steal arrows/space from form fields.
    if (isTypingTarget(event.target)) return;

    const swapped = isControlsSwapped();
    const key = event.key.toLowerCase();
    let handled = true;

    if (key === "arrowleft") {
      if (!armHoldEdge(hold, "left", event, swapped)) {
        fireHorizontal(actions, swapped, true);
      }
    } else if (key === "arrowright") {
      if (!armHoldEdge(hold, "right", event, swapped)) {
        fireHorizontal(actions, swapped, false);
      }
    } else if (key === "arrowup") {
      if (event.shiftKey && actions.tryLift) {
        actions.tryLift();
        recordReplayAction("LF");
      } else {
        fireRotate(actions, swapped, true);
      }
    } else if (key === "x") {
      fireRotate(actions, swapped, true);
    } else if (key === "z" || key === "control") {
      fireRotate(actions, swapped, false);
    } else if (key === "arrowdown") {
      actions.softDrop();
      recordReplayAction("SD");
    } else if (key === " ") {
      actions.hardDrop();
      recordReplayAction("HD");
    } else {
      handled = false;
    }

    // Stop browser scroll / button activation for keys we actually use.
    if (handled) event.preventDefault();
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      actions.normalSpeed();
      recordReplayAction("ND");
    }
    if (!hold) return;
    const key = event.key.toLowerCase();
    if (key === "arrowleft") hold.setLeftHeld(false);
    if (key === "arrowright") hold.setRightHeld(false);
  };

  window.addEventListener("keydown", handleKeyPress, false);
  window.addEventListener("keyup", handleKeyUp, false);

  const unbindTouch = bindTouchControls(actions, {
    continuous: isContinuousPhysics(),
    strafeSpeed,
    mode: getUserSettings().touchControlMode,
  });

  return () => {
    window.removeEventListener("keydown", handleKeyPress, false);
    window.removeEventListener("keyup", handleKeyUp, false);
    hold?.stop();
    unbindTouch();
  };
};
