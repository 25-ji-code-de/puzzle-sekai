/**
 * Touch control entry — dispatches to stick / gesture / drag / zones binders.
 */
import type { TouchControlMode } from "../settings/types";
import { isTouchUiBlocked } from "./touch-shared";
import type { TouchBindOptions, TouchPieceActions } from "./touch-shared";
import { bindStickTouch, resolveStickProfile } from "./touch-mode-stick";
import { bindGestureTouch } from "./touch-mode-gesture";
import { bindDragTouch } from "./touch-mode-drag";
import { bindZonesTouch } from "./touch-mode-zones";

export type { TouchPieceActions };
export { isTouchUiBlocked, resolveStickProfile };

export type TouchControlOptions = TouchBindOptions & {
  mode?: TouchControlMode;
};

/**
 * Bind touch for the active piece. Returns dispose().
 * Mode defaults to stick (current product default).
 */
export const bindTouchControls = (
  actions: TouchPieceActions,
  options: TouchControlOptions,
): (() => void) => {
  const mode: TouchControlMode = options.mode ?? "stick";
  const opts: TouchBindOptions = {
    continuous: options.continuous,
    strafeSpeed: options.strafeSpeed,
  };
  switch (mode) {
    case "gesture":
      return bindGestureTouch(actions, opts);
    case "drag":
      return bindDragTouch(actions, opts);
    case "zones":
      return bindZonesTouch(actions, opts);
    case "stick":
    default:
      return bindStickTouch(actions, opts);
  }
};
