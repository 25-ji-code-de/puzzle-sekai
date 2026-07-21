/**
 * Continuous-mode hold-to-strafe: while left/right stay down, integrate
 * horizontal motion every gameTicker frame (same clock as gravity).
 *
 * controls.ts only reports hold edges; this module owns per-frame motion.
 * No DAS/ARR stepping — discrete jumps feel stuttery next to smooth fall.
 */
import { gameTicker } from "../runtime";
import { isControlsSwapped } from "../fun/effects";

export type HoldMove = {
  setLeftHeld: (held: boolean) => void;
  setRightHeld: (held: boolean) => void;
  stop: () => void;
};

export type HoldMoveActions = {
  /**
   * Try to shift up to `distance` px in `direction`.
   * Return true if the piece actually moved (caller may cancel land lock / sfx).
   */
  shift: (direction: -1 | 1, distance: number) => boolean;
};

/** Cap PIXI delta so a long resume frame cannot teleport the piece. */
const MAX_DELTA = 3;

/**
 * @param actions  continuous shift callback (piece-specific collision)
 * @param speedPxPerDelta  px per ticker delta unit (see continuousStrafeSpeed)
 */
export const startHoldMove = (
  actions: HoldMoveActions,
  speedPxPerDelta: number,
): HoldMove => {
  let leftHeld = false;
  let rightHeld = false;
  let hooked = false;

  const tick = (delta: number) => {
    // Opposite keys cancel; neither → idle.
    if (leftHeld === rightHeld) return;
    const raw = Number.isFinite(delta) && delta > 0 ? delta : 0;
    if (raw <= 0) return;
    const dt = Math.min(raw, MAX_DELTA);
    const dist = speedPxPerDelta * dt;
    if (dist <= 0) return;

    const wantLeft = leftHeld;
    const swapped = isControlsSwapped();
    // Logical left held → physical left unless controls swapped.
    const direction: -1 | 1 = wantLeft === swapped ? 1 : -1;
    actions.shift(direction, dist);
  };

  const ensureHooked = () => {
    if (hooked) return;
    gameTicker.add(tick);
    hooked = true;
  };

  const unhookIfIdle = () => {
    if (leftHeld || rightHeld || !hooked) return;
    gameTicker.remove(tick);
    hooked = false;
  };

  return {
    setLeftHeld: (held) => {
      // Ignore re-arm from browser key-repeat (controls also filters repeat).
      if (held && leftHeld) return;
      leftHeld = held;
      if (held) ensureHooked();
      else unhookIfIdle();
    },
    setRightHeld: (held) => {
      if (held && rightHeld) return;
      rightHeld = held;
      if (held) ensureHooked();
      else unhookIfIdle();
    },
    stop: () => {
      leftHeld = false;
      rightHeld = false;
      if (hooked) {
        gameTicker.remove(tick);
        hooked = false;
      }
    },
  };
};
