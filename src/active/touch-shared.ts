/**
 * Shared touch binding primitives (surface, scale, fire helpers).
 */
import { app } from "../runtime";
import { STAGE_HEIGHT, STAGE_WIDTH } from "../config";
import { isControlsSwapped } from "../fun/effects";
import { recordReplayAction } from "../replay";
import { clientToStageScale } from "./touch-math";

export type TouchPieceActions = {
  moveLeft: () => void;
  moveRight: () => void;
  rotateCW: () => void;
  rotateCCW: () => void;
  hardDrop: () => void;
  softDrop: () => void;
  normalSpeed: () => void;
  tryLift?: () => void;
  shiftBy?: (stageDx: number) => boolean;
};

export type TouchBindOptions = {
  continuous: boolean;
  strafeSpeed?: number;
};

const TOUCH_UI_BLOCKER =
  'button, a, input, textarea, select, label, [contenteditable="true"], ' +
  '[contenteditable=""], .ui-overlay, .ui-dialog, .pause-fab, #pause-button, ' +
  "#pause-overlay, #settings-panel, [data-no-touch-play]";

export const isTouchUiBlocked = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(TOUCH_UI_BLOCKER));
};

export const viewEl = (): HTMLElement => app.view as HTMLElement;

export const scaleForView = () => {
  const rect = viewEl().getBoundingClientRect();
  return clientToStageScale(rect, STAGE_WIDTH, STAGE_HEIGHT);
};

export const isLeftHalf = (clientX: number): boolean => {
  const rect = viewEl().getBoundingClientRect();
  if (rect.width <= 0) return clientX < window.innerWidth / 2;
  return clientX < rect.left + rect.width / 2;
};

export const fireRotateAt = (
  actions: TouchPieceActions,
  clientX: number,
): void => {
  const swapped = isControlsSwapped();
  const wantCw = !isLeftHalf(clientX);
  const cw = wantCw !== swapped;
  (cw ? actions.rotateCW : actions.rotateCCW)();
  recordReplayAction(cw ? "CW" : "CCW");
};

export const fireHorizontalStep = (
  actions: TouchPieceActions,
  wantLeft: boolean,
): void => {
  const swapped = isControlsSwapped();
  const goLeft = wantLeft !== swapped;
  (goLeft ? actions.moveLeft : actions.moveRight)();
  recordReplayAction(goLeft ? "L" : "R");
};

export const applyContinuousDx = (
  actions: TouchPieceActions,
  stageDx: number,
): void => {
  if (!stageDx || !Number.isFinite(stageDx)) return;
  const swapped = isControlsSwapped();
  const logicalDx = swapped ? -stageDx : stageDx;
  if (actions.shiftBy) {
    const moved = actions.shiftBy(logicalDx);
    if (moved) {
      recordReplayAction(logicalDx < 0 ? "L" : "R");
    }
    return;
  }
  if (logicalDx < 0) fireHorizontalStep(actions, true);
  else fireHorizontalStep(actions, false);
};

export const armSoftDrop = (
  armed: { softDropArmed: boolean },
  actions: TouchPieceActions,
): void => {
  if (armed.softDropArmed) return;
  armed.softDropArmed = true;
  actions.softDrop();
  recordReplayAction("SD");
};

export const releaseSoftDrop = (
  armed: { softDropArmed: boolean },
  actions: TouchPieceActions,
): void => {
  if (!armed.softDropArmed) return;
  armed.softDropArmed = false;
  actions.normalSpeed();
  recordReplayAction("ND");
};

/** Install full-viewport pointer surface; returns surface + restore. */
export const openTouchSurface = (): {
  surface: HTMLElement;
  restore: () => void;
} => {
  const surface: HTMLElement = document.documentElement;
  const prevTouchAction = surface.style.touchAction;
  surface.style.touchAction = "none";
  return {
    surface,
    restore: () => {
      surface.style.touchAction = prevTouchAction;
    },
  };
};

export const MAX_DELTA = 3;
