/**
 * Continuous-mode hold-to-move: repeat left/right while keys stay down.
 *
 * Lives on gameTicker so pause / background / teardown follow the same clock
 * as active fall (never setInterval). controls.ts only reports hold edges;
 * this module owns the repeat schedule.
 */
import { gameTicker } from "../runtime";
import { isControlsSwapped } from "../fun/effects";

export type HoldMove = {
  setLeftHeld: (held: boolean) => void;
  setRightHeld: (held: boolean) => void;
  stop: () => void;
};

export type HoldMoveActions = {
  moveLeft: () => void;
  moveRight: () => void;
};

/**
 * Start a hold-move repeater. Call setLeftHeld/setRightHeld from key edges;
 * fire the matching move once on the edge yourself (for immediate response),
 * then this ticker keeps stepping while held.
 */
export const startHoldMove = (actions: HoldMoveActions): HoldMove => {
  let leftHeld = false;
  let rightHeld = false;
  let hooked = false;

  const tick = () => {
    if (!leftHeld && !rightHeld) return;
    const swapped = isControlsSwapped();
    if (leftHeld) (swapped ? actions.moveRight : actions.moveLeft)();
    if (rightHeld) (swapped ? actions.moveLeft : actions.moveRight)();
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
      leftHeld = held;
      if (held) ensureHooked();
      else unhookIfIdle();
    },
    setRightHeld: (held) => {
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
