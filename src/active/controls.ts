/**
 * Shared keyboard + Hammer bindings for the active falling piece.
 * Handles control-swap (Shizuku fun mode) for both standard and 2×2 pieces.
 */
import { app, hammerManager } from "../runtime";
import { isControlsSwapped } from "../fun/effects";

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

/** Bind controls; returns a dispose function that removes every listener. */
export const bindPieceControls = (
  actions: PieceControlActions,
): (() => void) => {
  const handleKeyPress = (event: KeyboardEvent) => {
    const swapped = isControlsSwapped();
    switch (event.key.toLowerCase()) {
      case "arrowleft":
        swapped ? actions.moveRight() : actions.moveLeft();
        break;
      case "arrowright":
        swapped ? actions.moveLeft() : actions.moveRight();
        break;
      case "arrowup":
        if (event.shiftKey && actions.tryLift) {
          actions.tryLift();
          break;
        }
        swapped ? actions.rotateCCW() : actions.rotateCW();
        break;
      case "x":
        swapped ? actions.rotateCCW() : actions.rotateCW();
        break;
      case "z":
      case "control":
        swapped ? actions.rotateCW() : actions.rotateCCW();
        break;
      case "arrowdown":
        actions.softDrop();
        break;
      case " ":
        actions.hardDrop();
        break;
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      actions.normalSpeed();
    }
  };

  const handleSwipeLeft = () =>
    isControlsSwapped() ? actions.moveRight() : actions.moveLeft();
  const handleSwipeRight = () =>
    isControlsSwapped() ? actions.moveLeft() : actions.moveRight();
  const handleSwipeUp = () => {
    actions.tryLift?.();
  };
  const handleTap = (e: HammerInput) => {
    const leftHalf = isLeftHalfOfCanvas(e.center.x);
    if (isControlsSwapped()) {
      leftHalf ? actions.rotateCW() : actions.rotateCCW();
    } else {
      leftHalf ? actions.rotateCCW() : actions.rotateCW();
    }
  };

  window.addEventListener("keydown", handleKeyPress, false);
  window.addEventListener("keyup", handleKeyUp, false);

  hammerManager.on("swipeleft", handleSwipeLeft);
  hammerManager.on("swiperight", handleSwipeRight);
  hammerManager.on("swipedown", actions.hardDrop);
  hammerManager.on("swipeup", handleSwipeUp);
  hammerManager.on("press", actions.softDrop);
  hammerManager.on("pressup", actions.normalSpeed);
  hammerManager.on("tap", handleTap);

  return () => {
    window.removeEventListener("keydown", handleKeyPress, false);
    window.removeEventListener("keyup", handleKeyUp, false);

    hammerManager.off("swiperight", handleSwipeRight);
    hammerManager.off("tap", handleTap);
    hammerManager.off("swipeleft", handleSwipeLeft);
    hammerManager.off("swipedown", actions.hardDrop);
    hammerManager.off("swipeup", handleSwipeUp);
    hammerManager.off("press", actions.softDrop);
    hammerManager.off("pressup", actions.normalSpeed);
  };
};
