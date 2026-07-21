/**
 * Shared keyboard + Hammer bindings for the active falling piece.
 * Handles control-swap (Shizuku fun mode) for both standard and 2×2 pieces.
 *
 * Pure input binding only: maps events → action callbacks. Continuous hold
 * repeat lives on gameTicker via hold-move.ts (passed in as optional bridge).
 */
import { app, hammerManager } from "../runtime";
import { isControlsSwapped } from "../fun/effects";
import { isReplayPlayback, recordReplayAction } from "../settings";
import type { HoldMove } from "./hold-move";

export type PieceControlActions = {
  moveLeft: () => void;
  moveRight: () => void;
  rotateCW: () => void;
  rotateCCW: () => void;
  hardDrop: () => void;
  softDrop: () => void;
  normalSpeed: () => void;
  /**
   * Optional easter-egg lift (Shift+↑ / swipe up).
   * Called only when the piece opts in (Emu / NeneRobo).
   */
  tryLift?: () => void;
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

/** True when focus is on a field that should keep native key behavior. */
const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

/**
 * Bind controls; returns a dispose function that removes every listener.
 * Pass `hold` in continuous mode so left/right key edges only arm/disarm
 * hold-strafe (per-frame motion lives on gameTicker — no discrete first step,
 * no browser key-repeat).
 */
export const bindPieceControls = (
  actions: PieceControlActions,
  hold?: HoldMove,
): (() => void) => {
  if (isReplayPlayback()) {
    return () => {};
  }

  const handleKeyPress = (event: KeyboardEvent) => {
    // Settings / dialogs: don't steal arrows/space from form fields.
    if (isTypingTarget(event.target)) return;

    const swapped = isControlsSwapped();
    let handled = true;
    const key = event.key.toLowerCase();

    switch (key) {
      case "arrowleft":
        if (hold) {
          // Continuous: edge arms strafe; browser repeat ignored.
          if (!event.repeat) {
            hold.setLeftHeld(true);
            recordReplayAction(swapped ? "R" : "L");
          }
        } else {
          (swapped ? actions.moveRight : actions.moveLeft)();
          recordReplayAction(swapped ? "R" : "L");
        }
        break;
      case "arrowright":
        if (hold) {
          if (!event.repeat) {
            hold.setRightHeld(true);
            recordReplayAction(swapped ? "L" : "R");
          }
        } else {
          (swapped ? actions.moveLeft : actions.moveRight)();
          recordReplayAction(swapped ? "L" : "R");
        }
        break;
      case "arrowup":
        if (event.shiftKey && actions.tryLift) {
          actions.tryLift();
          recordReplayAction("LF");
          break;
        }
        (swapped ? actions.rotateCCW : actions.rotateCW)();
        recordReplayAction(swapped ? "CCW" : "CW");
        break;
      case "x":
        (swapped ? actions.rotateCCW : actions.rotateCW)();
        recordReplayAction(swapped ? "CCW" : "CW");
        break;
      case "z":
      case "control":
        (swapped ? actions.rotateCW : actions.rotateCCW)();
        recordReplayAction(swapped ? "CW" : "CCW");
        break;
      case "arrowdown":
        actions.softDrop();
        recordReplayAction("SD");
        break;
      case " ":
        actions.hardDrop();
        recordReplayAction("HD");
        break;
      default:
        handled = false;
        break;
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
    if (hold) {
      const key = event.key.toLowerCase();
      if (key === "arrowleft") hold.setLeftHeld(false);
      if (key === "arrowright") hold.setRightHeld(false);
    }
  };

  const handleSwipeLeft = () => {
    if (isControlsSwapped()) {
      actions.moveRight();
      recordReplayAction("R");
      return;
    }
    actions.moveLeft();
    recordReplayAction("L");
  };
  const handleSwipeRight = () => {
    if (isControlsSwapped()) {
      actions.moveLeft();
      recordReplayAction("L");
      return;
    }
    actions.moveRight();
    recordReplayAction("R");
  };
  const handleSwipeUp = () => {
    actions.tryLift?.();
    recordReplayAction("LF");
  };
  const handleTap = (e: HammerInput) => {
    const leftHalf = isLeftHalfOfCanvas(e.center.x);
    if (isControlsSwapped()) {
      (leftHalf ? actions.rotateCW : actions.rotateCCW)();
      recordReplayAction(leftHalf ? "CW" : "CCW");
    } else {
      (leftHalf ? actions.rotateCCW : actions.rotateCW)();
      recordReplayAction(leftHalf ? "CCW" : "CW");
    }
  };
  const handlePress = () => {
    actions.softDrop();
    recordReplayAction("SD");
  };
  const handlePressUp = () => {
    actions.normalSpeed();
    recordReplayAction("ND");
  };

  const handleHardDrop = () => {
    actions.hardDrop();
    recordReplayAction("HD");
  };

  window.addEventListener("keydown", handleKeyPress, false);
  window.addEventListener("keyup", handleKeyUp, false);

  hammerManager.on("swipeleft", handleSwipeLeft);
  hammerManager.on("swiperight", handleSwipeRight);
  hammerManager.on("swipedown", handleHardDrop);
  hammerManager.on("swipeup", handleSwipeUp);
  hammerManager.on("press", handlePress);
  hammerManager.on("pressup", handlePressUp);
  hammerManager.on("tap", handleTap);

  return () => {
    window.removeEventListener("keydown", handleKeyPress, false);
    window.removeEventListener("keyup", handleKeyUp, false);
    hold?.stop();

    hammerManager.off("swiperight", handleSwipeRight);
    hammerManager.off("tap", handleTap);
    hammerManager.off("swipeleft", handleSwipeLeft);
    hammerManager.off("swipedown", handleHardDrop);
    hammerManager.off("swipeup", handleSwipeUp);
    hammerManager.off("press", handlePress);
    hammerManager.off("pressup", handlePressUp);
  };
};
